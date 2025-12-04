import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole, canAccessShop } from '@/lib/utils/roles'
import * as XLSX from 'xlsx'

export async function GET(
  request: NextRequest,
  { params }: { params: { shopId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role or access to this shop
    const role = await getUserRole(user.id)
    const hasAccess = role === 'admin' || await canAccessShop(user.id, params.shopId)
    
    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: 'You do not have access to this shop.' 
      }, { status: 403 })
    }

    // Get shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('name')
      .eq('id', params.shopId)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Get stock for this shop
    const { data: stock, error: stockError } = await supabase
      .from('shop_stock')
      .select(`
        packaging_units,
        loose_pieces,
        items (
          name,
          category,
          packaging_unit_description
        )
      `)
      .eq('shop_id', params.shopId)
      .order('items(category)')
      .order('items(name)')

    if (stockError) {
      return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 })
    }

    // Prepare data for Excel
    const excelData: any[] = []
    
    // Add header row
    excelData.push([
      'Productinformatie',
      'Verpakkings eenheid',
      'Aantal verpakkings',
      'Losse stuks'
    ])

    // Group by category
    const categoryGroups = new Map<string, any[]>()
    
    stock?.forEach((stockItem: any) => {
      const item = stockItem.items
      if (!item) return

      const category = item.category || 'Uncategorized'
      
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, [])
      }

      categoryGroups.get(category)!.push({
        name: item.name,
        packaging: item.packaging_unit_description || '',
        packaging_units: stockItem.packaging_units || 0,
        loose_pieces: stockItem.loose_pieces || 0
      })
    })

    // Add data grouped by category
    categoryGroups.forEach((items, category) => {
      // Add category header row (in uppercase for visibility)
      excelData.push([category.toUpperCase(), '', '', ''])
      
      // Add items in this category
      items.forEach(item => {
        excelData.push([
          item.name,
          item.packaging,
          item.packaging_units,
          item.loose_pieces
        ])
      })
    })

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(excelData)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 }, // Productinformatie
      { wch: 30 }, // Verpakkings eenheid
      { wch: 20 }, // Aantal verpakkings
      { wch: 15 }  // Losse stuks
    ]

    // Make category headers bold
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (let row = 0; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 })
      const cell = worksheet[cellAddress]
      if (cell && cell.v && typeof cell.v === 'string' && cell.v === cell.v.toUpperCase() && row > 0) {
        if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {}
        worksheet[cellAddress].s.font = { bold: true }
      }
    }

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, shop.name)

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `Stock_${shop.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.xlsx`

    // Return file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting shop stock:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

