'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Package, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface Item {
  id: string
  name: string
  category: string
  packaging_unit_description: string | null
  main_category: string
}

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedMainCategories, setCollapsedMainCategories] = useState<Set<string>>(new Set())
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; category: string; packaging_unit: string; main_category: string } | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [])

  const fetchItems = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('main_category')
        .order('category')
        .order('name')

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      alert('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const toggleMainCategory = (mainCategory: string) => {
    setCollapsedMainCategories(prev => {
      const next = new Set(prev)
      if (next.has(mainCategory)) {
        next.delete(mainCategory)
      } else {
        next.add(mainCategory)
      }
      return next
    })
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item.id)
    setEditForm({
      name: item.name,
      category: item.category,
      packaging_unit: item.packaging_unit_description || '',
      main_category: item.main_category || 'floor',
    })
  }

  const handleSave = async () => {
    if (!editingItem || !editForm) return

    try {
      const response = await fetch(`/api/items/${editingItem}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          packaging_unit_description: editForm.packaging_unit,
          main_category: editForm.main_category,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update item')
      }

      setEditingItem(null)
      setEditForm(null)
      await fetchItems()
    } catch (error) {
      console.error('Error updating item:', error)
      alert(error instanceof Error ? error.message : 'Failed to update item')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete item')
      }

      await fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete item')
    }
  }

  const handleRemoveDuplicates = async () => {
    if (!confirm('This will remove duplicate items (items with the same name). Continue?')) {
      return
    }

    try {
      // Find duplicates
      const nameMap = new Map<string, Item[]>()
      items.forEach(item => {
        const existing = nameMap.get(item.name) || []
        existing.push(item)
        nameMap.set(item.name, existing)
      })

      const duplicates: string[] = []
      nameMap.forEach((itemList, name) => {
        if (itemList.length > 1) {
          // Keep the first one, delete the rest
          for (let i = 1; i < itemList.length; i++) {
            duplicates.push(itemList[i].id)
          }
        }
      })

      if (duplicates.length === 0) {
        alert('No duplicates found!')
        return
      }

      // Delete duplicates
      for (const id of duplicates) {
        const response = await fetch(`/api/items/${id}`, {
          method: 'DELETE',
        })
        if (!response.ok) {
          throw new Error(`Failed to delete item ${id}`)
        }
      }

      alert(`Removed ${duplicates.length} duplicate item(s)`)
      await fetchItems()
    } catch (error) {
      console.error('Error removing duplicates:', error)
      alert('Failed to remove duplicates')
    }
  }

  // Group items by main_category first, then by category
  const groupedByMainCategory = items.reduce<Record<string, Record<string, Item[]>>>((acc, item) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading inventory...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-2 text-sm text-gray-600">
            Complete list of all products organized by main category (Floor / Catering) and shop category
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleRemoveDuplicates}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 min-h-[44px]"
          >
            Remove Duplicates
          </button>
          <Link
            href="/dashboard/items/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 min-h-[44px]"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {Object.keys(groupedByMainCategory).length > 0 ? (
        <div className="space-y-4">
          {mainCategories.map((mainCategory) => {
            const categoryGroups = groupedByMainCategory[mainCategory]
            if (!categoryGroups) return null

            const isMainCollapsed = collapsedMainCategories.has(mainCategory)

            return (
              <div key={mainCategory} className="bg-white shadow rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleMainCategory(mainCategory)}
                  className="w-full bg-indigo-50 px-6 py-4 border-b border-indigo-200 flex items-center justify-between hover:bg-indigo-100 transition-colors"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-indigo-900 capitalize">
                      {mainCategory === 'floor' ? 'Floor Items' : 'Catering Items'}
                    </h2>
                    <p className="text-sm text-indigo-700 mt-1">
                      {Object.values(categoryGroups).flat().length} total items
                    </p>
                  </div>
                  {isMainCollapsed ? (
                    <ChevronDown className="h-6 w-6 text-indigo-600" />
                  ) : (
                    <ChevronUp className="h-6 w-6 text-indigo-600" />
                  )}
                </button>

                {!isMainCollapsed && (
                  <div className="divide-y divide-gray-200">
                    {Object.entries(categoryGroups).map(([category, categoryItems]) => {
                      const isCategoryCollapsed = collapsedCategories.has(category)
                      
                      return (
                        <div key={category}>
                          <button
                            onClick={() => toggleCategory(category)}
                            className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                          >
                            <h3 className="text-lg font-semibold text-gray-900">
                              {category} ({categoryItems.length})
                            </h3>
                            {isCategoryCollapsed ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronUp className="h-5 w-5 text-gray-500" />
                            )}
                          </button>

                          {!isCategoryCollapsed && (
                            <div className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {categoryItems.map((item) => {
                                  const isEditing = editingItem === item.id

                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-start p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                    >
                                      {isEditing && editForm ? (
                                        <div className="flex-1 space-y-2">
                                          <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) =>
                                              setEditForm({ ...editForm, name: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            placeholder="Item name"
                                          />
                                          <select
                                            value={editForm.category}
                                            onChange={(e) =>
                                              setEditForm({ ...editForm, category: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          >
                                            {categories.map((cat) => (
                                              <option key={cat} value={cat}>
                                                {cat}
                                              </option>
                                            ))}
                                          </select>
                                          <input
                                            type="text"
                                            value={editForm.packaging_unit}
                                            onChange={(e) =>
                                              setEditForm({ ...editForm, packaging_unit: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            placeholder="Packaging unit"
                                          />
                                          <select
                                            value={editForm.main_category}
                                            onChange={(e) =>
                                              setEditForm({ ...editForm, main_category: e.target.value })
                                            }
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                          >
                                            <option value="floor">Floor</option>
                                            <option value="catering">Catering</option>
                                          </select>
                                          <div className="flex space-x-2">
                                            <button
                                              onClick={handleSave}
                                              className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingItem(null)
                                                setEditForm(null)
                                              }}
                                              className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
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
                                          <div className="flex space-x-1 ml-2">
                                            <button
                                              onClick={() => handleEdit(item)}
                                              className="p-1 text-indigo-600 hover:text-indigo-900"
                                              title="Edit"
                                            >
                                              <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDelete(item.id)}
                                              className="p-1 text-red-600 hover:text-red-900"
                                              title="Delete"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
          <p className="mt-1 text-sm text-gray-500">
            <Link href="/dashboard/items/new" className="text-indigo-600 hover:text-indigo-900">
              Add your first product
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
