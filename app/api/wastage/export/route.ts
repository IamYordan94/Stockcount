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
        details: 'Only administrators can export wastage data.' 
      }, { status: 403 })
    }

    // Get all wastage entries
    const { data: wastage, error: wastageError } = await supabase
      .from('wastage')
      .select(`
        date,
        quantity,
        notes,
        shops (name),
        items (name)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (wastageError) {
      return NextResponse.json({ error: 'Failed to fetch wastage' }, { status: 500 })
    }

    // Prepare data for Excel
    const excelData: any[] = []
    
    // Add header row
    excelData.push([
      'Date',
      'Shop',
      'Product',
      'Quantity',
      'Notes'
    ])

    // Add wastage entries
    wastage?.forEach((entry: any) => {
      excelData.push([
        entry.date,
        entry.shops?.name || '-',
        entry.items?.name || '-',
        entry.quantity,
        entry.notes || ''
      ])
    })

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(excelData)

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 25 }, // Shop
      { wch: 40 }, // Product
      { wch: 12 }, // Quantity
      { wch: 50 }  // Notes
    ]

    // Create workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Wastage')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `Wastage_${timestamp}.xlsx`

    // Return file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting wastage:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

