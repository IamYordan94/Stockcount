import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { shopName, items } = body

    if (!shopName || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Get or create shop
    let { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('name', shopName)
      .single()

    if (shopError && shopError.code === 'PGRST116') {
      // Shop doesn't exist, create it
      const { data: newShop, error: createError } = await supabase
        .from('shops')
        .insert({ name: shopName })
        .select('id')
        .single()

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create shop', details: createError.message },
          { status: 500 }
        )
      }
      shop = newShop
    } else if (shopError) {
      return NextResponse.json(
        { error: 'Failed to get shop', details: shopError.message },
        { status: 500 }
      )
    }

    if (!shop) {
      return NextResponse.json(
        { error: 'Failed to get or create shop' },
        { status: 500 }
      )
    }

    // Process items
    const itemsToInsert = []
    const itemsToUpdate = []

    for (const item of items) {
      // Get or create item
      let { data: existingItem, error: itemError } = await supabase
        .from('items')
        .select('id, category, packaging_unit_description')
        .eq('name', item.productinformatie)
        .single()

      let itemId: string

      if (itemError && itemError.code === 'PGRST116') {
        // Item doesn't exist, create it
        const { data: newItem, error: createError } = await supabase
          .from('items')
          .insert({
            name: item.productinformatie,
            category: item.category || 'Uncategorized',
            packaging_unit_description: item.verpakkingsEenheid || null,
          })
          .select('id')
          .single()

        if (createError) {
          console.error('Failed to create item:', createError)
          continue
        }
        itemId = newItem.id
      } else if (itemError) {
        console.error('Failed to get item:', itemError)
        continue
      } else {
        if (!existingItem) {
          console.error('Item lookup returned null without error for', item.productinformatie)
          continue
        }
        itemId = existingItem.id
        // Update item category if needed
        await supabase
          .from('items')
          .update({
            category: item.category || existingItem.category,
            packaging_unit_description: item.verpakkingsEenheid || null,
          })
          .eq('id', itemId)
      }

      // Check if shop_stock exists
      const { data: existingStock } = await supabase
        .from('shop_stock')
        .select('id')
        .eq('shop_id', shop.id)
        .eq('item_id', itemId)
        .single()

      if (existingStock) {
        itemsToUpdate.push({
          id: existingStock.id,
          packaging_units: item.aantal || 0,
          loose_pieces: item.losseStuks || 0,
          last_counted_by: user.id,
          last_counted_at: new Date().toISOString(),
        })
      } else {
        itemsToInsert.push({
          shop_id: shop.id,
          item_id: itemId,
          packaging_units: item.aantal || 0,
          loose_pieces: item.losseStuks || 0,
          last_counted_by: user.id,
          last_counted_at: new Date().toISOString(),
        })
      }
    }

    // Batch insert and update
    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('shop_stock')
        .insert(itemsToInsert)

      if (insertError) {
        console.error('Failed to insert stock:', insertError)
      }
    }

    if (itemsToUpdate.length > 0) {
      for (const update of itemsToUpdate) {
        const { id, ...updateData } = update
        const { error: updateError } = await supabase
          .from('shop_stock')
          .update(updateData)
          .eq('id', id)

        if (updateError) {
          console.error('Failed to update stock:', updateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${items.length} items for ${shopName}`,
      inserted: itemsToInsert.length,
      updated: itemsToUpdate.length,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

