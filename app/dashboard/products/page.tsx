'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../auth-provider'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Search, Package, Store, X, CheckSquare, Square, Download, Upload } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import HelpButton from '@/components/ui/HelpButton'
import UserManual from '@/components/ui/UserManual'
import type { Item, Category, Shop } from '@/types'

export default function ProductsPage() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [itemName, setItemName] = useState('')
  const [itemPackSize, setItemPackSize] = useState('')
  const [itemCategoryId, setItemCategoryId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shopViewMode, setShopViewMode] = useState(false)
  const [selectedShop, setSelectedShop] = useState<string>('')
  const [shopItems, setShopItems] = useState<Set<string>>(new Set())
  const [loadingShopItems, setLoadingShopItems] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (loading) return // Wait for auth to finish loading
    if (!user) {
      router.push('/login')
      return
    }
    if (role !== 'manager') {
      router.push('/dashboard')
      return
    }
    if (user && role === 'manager') {
      fetchData()
    }
  }, [user, loading, role, router])

  async function fetchData() {
    try {
      setLoadingData(true)
      const [itemsRes, categoriesRes, shopsRes] = await Promise.all([
        supabase
          .from('items')
          .select('*, categories(*)')
          .order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('shops').select('*').order('name'),
      ])

      if (itemsRes.error) {
        console.error('Error fetching items:', itemsRes.error)
        toast.error('Error loading items: ' + (itemsRes.error.message || 'Unknown error occurred'))
        setItems([])
      } else {
        setItems(itemsRes.data || [])
      }

      if (categoriesRes.error) {
        console.error('Error fetching categories:', categoriesRes.error)
        toast.error('Error loading categories: ' + (categoriesRes.error.message || 'Unknown error occurred'))
        setCategories([])
      } else {
        setCategories(categoriesRes.data || [])
      }

      if (shopsRes.error) {
        console.error('Error fetching shops:', shopsRes.error)
        toast.error('Error loading shops: ' + (shopsRes.error.message || 'Unknown error occurred'))
        setShops([])
      } else {
        setShops(shopsRes.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
      toast.error('Error loading data: ' + (err.message || 'Unknown error occurred'))
      setItems([])
      setCategories([])
      setShops([])
    } finally {
      setLoadingData(false)
    }
  }

  async function fetchShopItems(shopId: string) {
    if (!shopId) {
      setShopItems(new Set())
      return
    }

    setLoadingShopItems(true)
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('item_id')
        .eq('shop_id', shopId)

      if (error) {
        console.error('Error fetching shop items:', error)
        toast.error('Error loading shop items: ' + error.message)
        setShopItems(new Set())
      } else {
        setShopItems(new Set((data as Array<{ item_id: string }> | null)?.map((si) => si.item_id) || []))
      }
    } catch (err: any) {
      console.error('Error fetching shop items:', err)
      toast.error('Error loading shop items: ' + err.message)
      setShopItems(new Set())
    } finally {
      setLoadingShopItems(false)
    }
  }

  async function toggleItemInShop(itemId: string) {
    if (!selectedShop) return

    const isInShop = shopItems.has(itemId)
    const toastId = toast.loading(isInShop ? 'Removing item from shop...' : 'Adding item to shop...')

    try {
      if (isInShop) {
        const { error } = await supabase
          .from('shop_items')
          .delete()
          .eq('shop_id', selectedShop)
          .eq('item_id', itemId)

        if (error) {
          toast.dismiss(toastId)
          toast.error('Error removing item: ' + error.message)
          return
        }

        setShopItems((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        toast.dismiss(toastId)
        toast.success('Item removed from shop')
      } else {
        const { error } = await supabase.from('shop_items').insert({
          shop_id: selectedShop,
          item_id: itemId,
        })

        if (error) {
          toast.dismiss(toastId)
          toast.error('Error adding item: ' + error.message)
          return
        }

        setShopItems((prev) => new Set([...prev, itemId]))
        toast.dismiss(toastId)
        toast.success('Item added to shop')
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error('Error: ' + err.message)
    }
  }

  const filteredItems = useMemo(() => {
    let filtered = items

    // If in shop view mode, only show items assigned to the selected shop
    if (shopViewMode && selectedShop) {
      filtered = filtered.filter((item) => shopItems.has(item.id))
    }

    return filtered.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !categoryFilter || item.category_id === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [items, searchQuery, categoryFilter, shopViewMode, selectedShop, shopItems])

  async function saveItem() {
    if (!itemName.trim() || !itemPackSize.trim() || !itemCategoryId) {
      toast.error('Please fill in all fields')
      return
    }

    setSaving(true)
    const toastId = toast.loading(editingItem ? 'Updating product...' : 'Creating product...')

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update({
            name: itemName,
            pack_size: itemPackSize,
            category_id: itemCategoryId,
          })
          .eq('id', editingItem.id)

        if (error) {
          toast.dismiss(toastId)
          toast.error(`Error updating item: ${error.message}`)
          return
        }
        toast.dismiss(toastId)
        toast.success('Product updated successfully!')
      } else {
        const { error } = await supabase.from('items').insert({
          name: itemName,
          pack_size: itemPackSize,
          category_id: itemCategoryId,
        })

        if (error) {
          toast.dismiss(toastId)
          toast.error(`Error creating item: ${error.message}`)
          return
        }
        toast.dismiss(toastId)
        toast.success('Product created successfully!')
      }

      setShowItemModal(false)
      setEditingItem(null)
      setItemName('')
      setItemPackSize('')
      setItemCategoryId('')
      fetchData()
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Unexpected error saving item:', err)
      toast.error('Unexpected error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem() {
    if (!itemToDelete) return

    setDeleting(true)
    const toastId = toast.loading('Deleting product...')

    try {
      const { error } = await supabase.from('items').delete().eq('id', itemToDelete)

      if (error) {
        toast.dismiss(toastId)
        toast.error('Error deleting item: ' + error.message)
      } else {
        toast.dismiss(toastId)
        toast.success('Product deleted successfully!')
        fetchData()
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error('Error: ' + err.message)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setItemToDelete(null)
    }
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)))
    }
  }

  async function bulkDeleteItems() {
    if (selectedItems.size === 0) return

    setDeleting(true)
    const toastId = toast.loading(`Deleting ${selectedItems.size} product(s)...`)

    try {
      const itemIds = Array.from(selectedItems)
      const { error } = await supabase.from('items').delete().in('id', itemIds)

      if (error) {
        toast.dismiss(toastId)
        toast.error(`Error deleting products: ${error.message}`)
        return
      }

      toast.dismiss(toastId)
      toast.success(`${selectedItems.size} product(s) deleted successfully!`)
      setSelectedItems(new Set())
      setBulkDeleteMode(false)
      fetchData()
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error('Error: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  function exportToCSV() {
    const headers = ['Name', 'Pack Size', 'Category']
    const rows = items.map((item) => [
      item.name,
      item.pack_size,
      item.categories?.name || 'Unknown',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Products exported to CSV successfully!')
  }

  function downloadTemplate() {
    const headers = ['Name', 'Pack Size', 'Category']
    const exampleRow = ['Example Product', '12 per pack', 'Food']
    const csvContent = [
      headers.join(','),
      exampleRow.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'products_import_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Template downloaded!')
  }

  async function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    const toastId = toast.loading('Importing products...')

    try {
      const text = await file.text()
      const lines = text.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        toast.dismiss(toastId)
        toast.error('CSV file must have at least a header row and one data row')
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      const nameIndex = headers.findIndex((h) => h.toLowerCase() === 'name')
      const packSizeIndex = headers.findIndex((h) => h.toLowerCase().includes('pack'))
      const categoryIndex = headers.findIndex((h) => h.toLowerCase() === 'category')

      if (nameIndex === -1) {
        toast.dismiss(toastId)
        toast.error('CSV must have a "Name" column')
        return
      }

      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
        return {
          name: values[nameIndex] || '',
          pack_size: values[packSizeIndex] || '',
          category: values[categoryIndex] || '',
        }
      })

      let successCount = 0
      let errorCount = 0

      for (const row of rows) {
        if (!row.name.trim()) continue

        // Find category by name
        let categoryId = ''
        if (row.category) {
          const category = categories.find((c) => c.name.toLowerCase() === row.category.toLowerCase())
          if (category) {
            categoryId = category.id
          } else {
            // Create category if it doesn't exist
            const { data: newCategory, error: catError } = await supabase
              .from('categories')
              .insert({ name: row.category })
              .select()
              .single()

            if (!catError && newCategory) {
              categoryId = newCategory.id
              setCategories((prev) => [...prev, newCategory])
            }
          }
        }

        const { error } = await supabase.from('items').insert({
          name: row.name.trim(),
          pack_size: row.pack_size.trim() || '',
          category_id: categoryId || null,
        })

        if (error) {
          errorCount++
          console.error('Error importing item:', row.name, error)
        } else {
          successCount++
        }
      }

      toast.dismiss(toastId)
      if (successCount > 0) {
        toast.success(`Imported ${successCount} product(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`)
        fetchData()
        setShowImportModal(false)
      } else {
        toast.error(`Failed to import products. ${errorCount} error(s)`)
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error('Error importing file: ' + err.message)
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  function openEditModal(item: Item) {
    setEditingItem(item)
    setItemName(item.name)
    setItemPackSize(item.pack_size)
    setItemCategoryId(item.category_id)
    setShowItemModal(true)
  }

  function openCreateModal() {
    setEditingItem(null)
    setItemName('')
    setItemPackSize('')
    setItemCategoryId(categories[0]?.id || '')
    setShowItemModal(true)
  }

  function handleDeleteClick(itemId: string) {
    setItemToDelete(itemId)
    setShowDeleteDialog(true)
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md shadow-medium border-b border-white/20 sticky top-0 z-50">
        <div className="container-mobile py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-xl transition-all">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Products</h1>
            </div>
            <HelpButton onClick={() => setShowManual(true)} />
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-primary-600 hover:to-indigo-700 transition-all shadow-glow hover:shadow-glow-lg font-medium group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Add Product
          </button>
          <button
            onClick={() => {
              setShopViewMode(!shopViewMode)
              if (shopViewMode) {
                setSelectedShop('')
                setShopItems(new Set())
              }
            }}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-medium ${
              shopViewMode
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800'
                : 'bg-gradient-to-r from-gray-600 to-slate-700 text-white hover:from-gray-700 hover:to-slate-800'
            }`}
          >
            <Store size={20} />
            {shopViewMode ? 'View All Products' : 'See Products per Shop'}
          </button>
          {!shopViewMode && (
            <>
              <button
                onClick={() => {
                  setBulkDeleteMode(!bulkDeleteMode)
                  setSelectedItems(new Set())
                }}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-medium ${
                  bulkDeleteMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {bulkDeleteMode ? <X size={20} /> : <CheckSquare size={20} />}
                {bulkDeleteMode ? 'Cancel Bulk' : 'Bulk Delete'}
              </button>
              {bulkDeleteMode && selectedItems.size > 0 && (
                <button
                  onClick={bulkDeleteItems}
                  disabled={deleting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50"
                >
                  <Trash2 size={20} />
                  Delete Selected ({selectedItems.size})
                </button>
              )}
              <button
                onClick={exportToCSV}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-green-500 text-green-600 rounded-xl hover:bg-green-50 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <Download size={20} />
                Export CSV
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-blue-500 text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <Upload size={20} />
                Import CSV
              </button>
            </>
          )}
        </div>

        {/* Shop Selector - Only show in shop view mode */}
        {shopViewMode && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Shop</label>
            <div className="flex gap-3">
              <select
                value={selectedShop}
                onChange={(e) => {
                  setSelectedShop(e.target.value)
                  fetchShopItems(e.target.value)
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="">Select a shop...</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              {selectedShop && (
                <button
                  onClick={() => {
                    setSelectedShop('')
                    setShopItems(new Set())
                  }}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  aria-label="Clear shop selection"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            {selectedShop && (
              <p className="text-sm text-gray-600 mt-2">
                Showing products for: <strong>{shops.find((s) => s.id === selectedShop)?.name}</strong>
              </p>
            )}
          </div>
        )}

        {/* Search and Filter */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {filteredItems.length === 0 && !loadingData && (
          <EmptyState
            icon={Package}
            title={searchQuery || categoryFilter ? 'No products found' : 'No products yet'}
            description={
              searchQuery || categoryFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'Add your first product to get started.'
            }
            action={
              !searchQuery && !categoryFilter
                ? {
                    label: 'Add Product',
                    onClick: openCreateModal,
                  }
                : undefined
            }
          />
        )}

        {shopViewMode && selectedShop && loadingShopItems && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )}

        {shopViewMode && selectedShop && !loadingShopItems && filteredItems.length === 0 && (
          <EmptyState
            icon={Package}
            title="No products in this shop"
            description="Add products to this shop using the controls below."
          />
        )}

        {bulkDeleteMode && filteredItems.length > 0 && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              {selectedItems.size === filteredItems.length ? (
                <CheckSquare size={18} className="text-primary-600" />
              ) : (
                <Square size={18} />
              )}
              <span className="font-medium">
                {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            {selectedItems.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedItems.size} of {filteredItems.length} selected
              </span>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div key={item.id} className={`bg-white p-4 rounded-lg shadow-sm border ${bulkDeleteMode && selectedItems.has(item.id) ? 'border-primary-500 bg-primary-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {bulkDeleteMode && (
                    <button
                      onClick={() => toggleItemSelection(item.id)}
                      className="mt-1"
                    >
                      {selectedItems.has(item.id) ? (
                        <CheckSquare size={20} className="text-primary-600" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Category: {item.categories?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">Pack Size: {item.pack_size}</p>
                  </div>
                </div>
                {!bulkDeleteMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-primary-600 hover:text-primary-800 transition-colors"
                      aria-label="Edit product"
                    >
                      <Edit size={20} />
                    </button>
                    {shopViewMode && selectedShop ? (
                      <button
                        onClick={() => toggleItemInShop(item.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          shopItems.has(item.id)
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        aria-label={shopItems.has(item.id) ? 'Remove from shop' : 'Add to shop'}
                      >
                        {shopItems.has(item.id) ? 'Remove from Shop' : 'Add to Shop'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        aria-label="Delete product"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add products to shop section - Only show in shop view with selected shop */}
        {shopViewMode && selectedShop && (
          <div className="mt-8 p-6 bg-white rounded-xl border-2 border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Products to This Shop</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select products below to add them to <strong>{shops.find((s) => s.id === selectedShop)?.name}</strong>
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {items
                .filter((item) => !shopItems.has(item.id))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItemInShop(item.id)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {item.categories?.name} • {item.pack_size}
                      </span>
                    </div>
                    <Plus size={18} className="text-primary-600" />
                  </button>
                ))}
              {items.filter((item) => !shopItems.has(item.id)).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">All products are already in this shop</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false)
          setEditingItem(null)
          setItemName('')
          setItemPackSize('')
          setItemCategoryId('')
        }}
        title={editingItem ? 'Edit Product' : 'Add Product'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="Enter item name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pack Size</label>
            <input
              type="text"
              value={itemPackSize}
              onChange={(e) => setItemPackSize(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="e.g., 12 per pack, 500g"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <select
              value={itemCategoryId}
              onChange={(e) => setItemCategoryId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={saveItem}
            disabled={saving}
            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                {editingItem ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingItem ? 'Update' : 'Create'
            )}
          </button>
          <button
            onClick={() => {
              setShowItemModal(false)
              setEditingItem(null)
              setItemName('')
              setItemPackSize('')
              setItemCategoryId('')
            }}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setItemToDelete(null)
        }}
        onConfirm={deleteItem}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />

      <UserManual isOpen={showManual} onClose={() => setShowManual(false)} initialSection="products" />

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
        }}
        title="Import Products from CSV"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>CSV Format:</strong> Name, Pack Size, Category
            </p>
            <p className="text-xs text-blue-700">
              The first row should be headers. Categories will be created automatically if they don't exist.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Download Template
            </button>
            <label className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all cursor-pointer text-center text-sm font-medium">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                disabled={importing}
                className="hidden"
              />
              {importing ? 'Importing...' : 'Choose CSV File'}
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
