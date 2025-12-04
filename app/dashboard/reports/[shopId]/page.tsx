import { createClient } from '@/lib/supabase/server'
import { canAccessShop, getUserRole } from '@/lib/utils/roles'
import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import Link from 'next/link'

export default async function ShopReportPage({
  params,
}: {
  params: { shopId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check access
  const hasAccess = await canAccessShop(user.id, params.shopId)
  if (!hasAccess) {
    redirect('/dashboard/reports')
  }

  const role = await getUserRole(user.id)
  const isAdmin = role === 'admin'

  // Get shop
  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('id', params.shopId)
    .single()

  // Get stock for this shop
  const { data: stock } = await supabase
    .from('shop_stock')
    .select(`
      *,
      items (
        id,
        name,
        category,
        packaging_unit_description
      )
    `)
    .eq('shop_id', params.shopId)
    .order('items(category)', { ascending: true })
    .order('items(name)', { ascending: true })

  type StockRow = {
    id: string
    packaging_units: number
    loose_pieces: number
    items: {
      id: string
      name: string
      category: string | null
      packaging_unit_description: string | null
    }
  }

  const typedStock = (stock || []) as StockRow[]

  // Group by category
  const groupedStock = typedStock.reduce<Record<string, StockRow[]>>((acc, s) => {
    const category = s.items.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(s)
    return acc
  }, {} as Record<string, StockRow[]>)

  const groupedEntries = Object.entries(groupedStock) as [string, StockRow[]][]

  // Calculate totals
  const totalPackaging = typedStock.reduce((sum, s) => sum + (s.packaging_units || 0), 0)
  const totalLoose = typedStock.reduce((sum, s) => sum + (s.loose_pieces || 0), 0)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/dashboard/reports" className="text-indigo-600 hover:text-indigo-800 text-sm">
            ← Back to Reports
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">{shop?.name} - Stock Report</h1>
        </div>
        {isAdmin && (
          <a
            href={`/api/export/${params.shopId}`}
            download
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors min-h-[44px]"
          >
            <Download className="h-5 w-5 mr-2" />
            Download Excel
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Packaging Units</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalPackaging}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Loose Pieces</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalLoose}</p>
        </div>
      </div>

      {Object.keys(groupedStock).length > 0 ? (
        <div className="space-y-6">
          {groupedEntries.map(([category, categoryStock]) => (
            <div key={category} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Packaging Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Aantal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Losse Stuks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryStock.map((s) => (
                      <tr key={s.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {s.items.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {s.items.packaging_unit_description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {s.packaging_units}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {s.loose_pieces}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No stock data available.</p>
        </div>
      )}
    </div>
  )
}

