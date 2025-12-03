import { createClient } from '@/lib/supabase/server'
import { getUserRole, getUserShopId } from '@/lib/utils/roles'
import Link from 'next/link'
import { Store } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const role = await getUserRole(user.id)
  const userShopId = await getUserShopId(user.id)

  // Admins see all shops, others see only their shop
  let query = supabase.from('shops').select('*').order('name')

  if (role !== 'admin' && userShopId) {
    query = query.eq('id', userShopId)
  }

  const { data: shops } = await query

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports</h1>

      {shops && shops.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/dashboard/reports/${shop.id}`}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Store className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {shop.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      View stock report
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Store className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No shops</h3>
          <p className="mt-1 text-sm text-gray-500">
            Import an Excel file to create shops.
          </p>
        </div>
      )}
    </div>
  )
}

