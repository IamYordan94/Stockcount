import { createClient } from '@/lib/supabase/server'
import { canAccessShop, getUserRole } from '@/lib/utils/roles'
import { redirect } from 'next/navigation'
import StockTableClient from '@/components/stock/StockTableClient'

export default async function ShopDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check access
  const hasAccess = await canAccessShop(user.id, params.id)
  if (!hasAccess) {
    redirect('/dashboard/shops')
  }

  // Check if user is admin (for item editing)
  const role = await getUserRole(user.id)
  const isAdmin = role === 'admin'

  // Get shop
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('id', params.id)
    .single()

  if (shopError || !shop) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold mb-2">Error loading shop</h3>
        <p className="text-red-600 text-sm">{shopError?.message || 'Shop not found'}</p>
        {shopError && (
          <>
            <p className="text-red-600 text-sm mt-2">Error code: {shopError.code}</p>
            <p className="text-red-600 text-sm mt-2">Details: {shopError.details || 'No details'}</p>
            <p className="text-red-600 text-sm mt-2">Hint: {shopError.hint || 'No hint'}</p>
          </>
        )}
        <p className="text-gray-600 text-xs mt-4">
          This might be an RLS (Row Level Security) issue. Make sure:
          <br />1. You are assigned to this shop in an active stock count period
          <br />2. The shop exists in the database
          <br />3. Visit <a href="/dashboard/debug" className="text-blue-600 underline">/dashboard/debug</a> to check your role and assignments
        </p>
      </div>
    )
  }

  // Get stock for this shop
  const { data: stock, error: stockError } = await supabase
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
    .eq('shop_id', params.id)
    .order('items(category)', { ascending: true })
    .order('items(name)', { ascending: true })

  if (stockError) {
    return (
      <div className="text-red-600">
        Error loading stock: {stockError.message}
      </div>
    )
  }

  // Transform data for StockTable
  const stockItems = (stock || []).map((s: any) => ({
    id: s.id,
    item_id: s.item_id,
    item_name: s.items.name,
    category: s.items.category,
    packaging_unit_description: s.items.packaging_unit_description,
    packaging_units: s.packaging_units,
    loose_pieces: s.loose_pieces,
    last_counted_at: s.last_counted_at,
    last_counted_by: s.last_counted_by,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{shop.name}</h1>
        {shop.address && (
          <p className="text-gray-600 mt-1">{shop.address}</p>
        )}
      </div>

      {stockItems.length > 0 ? (
        <StockTableClient items={stockItems} shopId={params.id} isAdmin={isAdmin} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No stock items found for this shop.</p>
          <p className="text-sm text-gray-400 mt-2">
            Import an Excel file to add stock items.
          </p>
        </div>
      )}
    </div>
  )
}

