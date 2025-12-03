import { createClient } from '@/lib/supabase/server'
import { Package } from 'lucide-react'

export default async function ItemsPage() {
  const supabase = await createClient()

  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .order('category')
    .order('name')

  if (error) {
    return (
      <div className="text-red-600">
        Error loading items: {error.message}
      </div>
    )
  }

  type Item = NonNullable<typeof items>[number]

  // Group items by category
  const groupedItems = (items || []).reduce<Record<string, Item[]>>((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof items>)

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Items Catalog</h1>

      {Object.keys(groupedItems).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {categoryItems.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item.name}
                        </h4>
                        {item.packaging_unit_description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {item.packaging_unit_description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Import an Excel file to create items.
          </p>
        </div>
      )}
    </div>
  )
}

