import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/utils/roles'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role (required for export)
    const role = await getUserRole(user.id)
    
    if (!role || role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: 'Only administrators can export stock data.' 
      }, { status: 403 })
    }

    // Get all shops
    const { data: shops, error: shopsError } = await supabase
      .from('shops')
      .select('id, name')
      .order('name')

    if (shopsError) {
      return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 })
    }

    if (!shops || shops.length === 0) {
      return NextResponse.json({ error: 'No shops found' }, { status: 404 })
    }

    // Create workbook
    const workbook = XLSX.utils.book_new()

    // For each shop, create a sheet with stock data
    for (const shop of shops) {
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
        .eq('shop_id', shop.id)
        .order('items(category)')
        .order('items(name)')

      if (stockError) {
        console.error(`Error fetching stock for ${shop.name}:`, stockError)
        continue
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
      let currentCategory = ''

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

      // Make category headers bold (first column, category rows)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      for (let row = 0; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 })
        const cell = worksheet[cellAddress]
        if (cell && cell.v && typeof cell.v === 'string' && cell.v === cell.v.toUpperCase() && row > 0) {
          // This is likely a category header
          if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {}
          worksheet[cellAddress].s.font = { bold: true }
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, shop.name)
    }

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const filename = `Stock_Count_${timestamp}.xlsx`

    // Return file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting stock:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

