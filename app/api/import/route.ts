import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/utils/roles'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: 'You must be logged in to import data' 
      }, { status: 401 })
    }

    // Check if user has admin role (required for import)
    const role = await getUserRole(user.id)
    
    // Debug logging to diagnose role detection issues
    console.log('Import API - User ID:', user.id)
    console.log('Import API - User Email:', user.email)
    console.log('Import API - Detected Role:', role)
    console.log('Import API - Role Check:', role === 'admin')
    
    if (!role || role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: 'Only administrators can import shops and items. Please contact an admin to import data.',
        debug: { userId: user.id, detectedRole: role }
      }, { status: 403 })
    }

    const body = await request.json()
    const { shopName, items } = body

    if (!shopName || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request data', details: 'Missing shopName or items array' },
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
        console.error('Failed to create shop:', createError)
        return NextResponse.json(
          { 
            error: 'Failed to create shop', 
            details: createError.message,
            code: createError.code,
            hint: createError.hint || 'Check if you have permission to create shops'
          },
          { status: 500 }
        )
      }
      shop = newShop
    } else if (shopError) {
      console.error('Failed to get shop:', shopError)
      return NextResponse.json(
        { 
          error: 'Failed to get shop', 
          details: shopError.message,
          code: shopError.code
        },
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
    let insertErrors: string[] = []
    let updateErrors: string[] = []

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('shop_stock')
        .insert(itemsToInsert)

      if (insertError) {
        console.error('Failed to insert stock:', insertError)
        insertErrors.push(insertError.message)
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
          updateErrors.push(updateError.message)
        }
      }
    }

    // If there were errors, return partial success
    if (insertErrors.length > 0 || updateErrors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Partially imported ${shopName}. Some items failed.`,
        inserted: itemsToInsert.length - insertErrors.length,
        updated: itemsToUpdate.length - updateErrors.length,
        errors: {
          insert: insertErrors,
          update: updateErrors,
        },
      }, { status: 207 }) // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${items.length} items for ${shopName}`,
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

