import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageUsers } from '@/lib/utils/roles'
import { Package } from 'lucide-react'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const canManage = await canManageUsers(user.id)
  if (!canManage) {
    redirect('/dashboard')
  }

  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .order('main_category')
    .order('category')
    .order('name')

  if (error) {
    return (
      <div className="text-red-600">
        Error loading inventory: {error.message}
      </div>
    )
  }

  type Item = NonNullable<typeof items>[number]

  // Group items by main_category first, then by category
  const groupedByMainCategory = (items || []).reduce<Record<string, Record<string, Item[]>>>((acc, item) => {
    const mainCategory = item.main_category || 'floor'
    const category = item.category || 'Uncategorized'
    
    if (!acc[mainCategory]) {
      acc[mainCategory] = {}
    }
    if (!acc[mainCategory][category]) {
      acc[mainCategory][category] = []
    }
    acc[mainCategory][category].push(item)
    return acc
  }, {})

  const mainCategories = ['floor', 'catering']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="mt-2 text-sm text-gray-600">
          Complete list of all products organized by main category (Floor / Catering) and shop category
        </p>
      </div>

      {Object.keys(groupedByMainCategory).length > 0 ? (
        <div className="space-y-8">
          {mainCategories.map((mainCategory) => {
            const categoryGroups = groupedByMainCategory[mainCategory]
            if (!categoryGroups) return null

            return (
              <div key={mainCategory} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-200">
                  <h2 className="text-2xl font-bold text-indigo-900 capitalize">
                    {mainCategory === 'floor' ? 'Floor Items' : 'Catering Items'}
                  </h2>
                  <p className="text-sm text-indigo-700 mt-1">
                    {Object.values(categoryGroups).flat().length} total items
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {Object.entries(categoryGroups).map(([category, categoryItems]) => (
                    <div key={category} className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categoryItems.map((item) => (
                          <div key={item.id} className="flex items-start p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                            <Package className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {item.name}
                              </h4>
                              {item.packaging_unit_description && (
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                  {item.packaging_unit_description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Run the seed SQL to populate inventory.
          </p>
        </div>
      )}
    </div>
  )
}

