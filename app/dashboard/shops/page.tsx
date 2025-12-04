import { createClient } from '@/lib/supabase/server'
import { getUserRole, getUserAssignedShops } from '@/lib/utils/roles'
import Link from 'next/link'
import { Store, Plus } from 'lucide-react'

export default async function ShopsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const role = await getUserRole(user.id)
  let shops

  if (role === 'admin') {
    // Admins see all shops
    const { data, error } = await supabase.from('shops').select('*').order('name')
    if (error) {
      console.error('Error loading shops:', error)
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error loading shops</h3>
          <p className="text-red-600 text-sm">{error.message}</p>
          <p className="text-red-600 text-sm mt-2">Error code: {error.code}</p>
          <p className="text-red-600 text-sm mt-2">Details: {error.details || 'No details'}</p>
          <p className="text-red-600 text-sm mt-2">Hint: {error.hint || 'No hint'}</p>
          <p className="text-gray-600 text-xs mt-4">
            This might be an RLS (Row Level Security) issue. Check:
            <br />1. Your user_roles entry exists and role = &apos;admin&apos;
            <br />2. RLS policies are correctly set up
            <br />3. Visit <Link href="/dashboard/debug" className="text-blue-600 underline">/dashboard/debug</Link> to see your role status
          </p>
        </div>
      )
    }
    shops = data || []
    console.log('Shops loaded:', shops?.length || 0)
  } else {
    // Get assigned shops
    const assignedShopIds = await getUserAssignedShops(user.id)
    
    if (assignedShopIds.length === 0) {
      shops = []
    } else {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .in('id', assignedShopIds)
        .order('name')
      
      if (error) {
        return (
          <div className="text-red-600">
            Error loading shops: {error.message}
          </div>
        )
      }
      shops = data
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shops</h1>
          {role === 'admin' && (
            <p className="text-sm text-gray-600 mt-1">
              As an admin, you can access all shops to count stock. Click on any shop to start counting.
            </p>
          )}
        </div>
        {role === 'admin' && (
          <Link
            href="/dashboard/shops/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Shop
          </Link>
        )}
      </div>

      {/* Debug info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>Role: {role || 'null'}</p>
        <p>Shops count: {shops?.length || 0}</p>
        <p>User ID: {user.id.substring(0, 8)}...</p>
        {role !== 'admin' && (
          <p className="text-red-600 mt-2">
            ⚠️ You are not detected as admin. Visit <Link href="/dashboard/debug" className="underline">/dashboard/debug</Link> to check your role.
          </p>
        )}
      </div>

      {shops && shops.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/dashboard/shops/${shop.id}`}
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
                    {shop.address && (
                      <p className="text-sm text-gray-500">{shop.address}</p>
                    )}
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
            {role === 'admin' 
              ? 'Create your first shop to get started.'
              : 'No shops assigned to you yet.'}
          </p>
        </div>
      )}
    </div>
  )
}

