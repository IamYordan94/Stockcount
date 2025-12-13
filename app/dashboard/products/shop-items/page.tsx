'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../auth-provider'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Check, Search, Package } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Shop, Item } from '@/types'

export default function ShopItemsPage() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShop, setSelectedShop] = useState<string>('')
  const [items, setItems] = useState<Item[]>([])
  const [assignedItems, setAssignedItems] = useState<Set<string>>(new Set())
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!loading && (!user || role !== 'manager')) {
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
      const [shopsRes, itemsRes] = await Promise.all([
        supabase.from('shops').select('*').order('name'),
        supabase.from('items').select('*, categories(*)').order('name'),
      ])

      if (shopsRes.error) {
        console.error('Error fetching shops:', shopsRes.error)
        toast.error('Error loading shops: ' + shopsRes.error.message)
        setShops([])
      } else {
        setShops(shopsRes.data || [])
      }

      if (itemsRes.error) {
        console.error('Error fetching items:', itemsRes.error)
        toast.error('Error loading items: ' + itemsRes.error.message)
        setItems([])
      } else {
        setItems(itemsRes.data || [])
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
      toast.error('Error loading data: ' + err.message)
      setShops([])
      setItems([])
    } finally {
      setLoadingData(false)
    }
  }

  async function fetchAssignedItems(shopId: string) {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('item_id')
        .eq('shop_id', shopId)

      if (error) {
        console.error('Error fetching assigned items:', error)
        toast.error('Error loading assigned items: ' + error.message)
        setAssignedItems(new Set())
      } else {
        setAssignedItems(new Set((data as Array<{ item_id: string }> | null)?.map((si) => si.item_id) || []))
      }
    } catch (err: any) {
      console.error('Error fetching assigned items:', err)
      toast.error('Error loading assigned items: ' + err.message)
      setAssignedItems(new Set())
    }
  }

  useEffect(() => {
    if (selectedShop) {
      fetchAssignedItems(selectedShop)
    } else {
      setAssignedItems(new Set())
    }
  }, [selectedShop])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !categoryFilter || item.category_id === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [items, searchQuery, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Map<string, { id: string; name: string }>()
    items.forEach((item) => {
      if (item.categories && !cats.has(item.categories.id)) {
        cats.set(item.categories.id, { id: item.categories.id, name: item.categories.name })
      }
    })
    return Array.from(cats.values())
  }, [items])

  async function toggleItemAssignment(itemId: string) {
    if (!selectedShop) return

    setTogglingItems((prev) => new Set([...prev, itemId]))
    const isAssigned = assignedItems.has(itemId)

    try {
      if (isAssigned) {
        const { error } = await supabase
          .from('shop_items')
          .delete()
          .eq('shop_id', selectedShop)
          .eq('item_id', itemId)

        if (error) {
          toast.error('Error removing item: ' + error.message)
          return
        }

        setAssignedItems((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
        toast.success('Item removed from shop')
      } else {
        const { error } = await supabase.from('shop_items').insert({
          shop_id: selectedShop,
          item_id: itemId,
        })

        if (error) {
          toast.error('Error assigning item: ' + error.message)
          return
        }

        setAssignedItems((prev) => new Set([...prev, itemId]))
        toast.success('Item assigned to shop')
      }
    } finally {
      setTogglingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const selectedShopName = shops.find((s) => s.id === selectedShop)?.name

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container-mobile py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/products" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Assign Items to Shops</h1>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Shop</label>
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="">Select a shop</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedShop && (
        <div className="container-mobile py-6">
          <p className="text-sm text-gray-600 mb-4">
            Select items to assign to <strong>{selectedShopName}</strong>. Items not assigned will not appear in the
            counting interface for this shop.
          </p>

          {/* Search and Filter */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

          {filteredItems.length === 0 && (
            <EmptyState
              icon={Package}
              title={searchQuery || categoryFilter ? 'No items found' : 'No items available'}
              description={
                searchQuery || categoryFilter
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Add products first before assigning them to shops.'
              }
            />
          )}

          <div className="space-y-2">
            {filteredItems.map((item) => {
              const isAssigned = assignedItems.has(item.id)
              const isToggling = togglingItems.has(item.id)
              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      {item.categories?.name} • {item.pack_size}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleItemAssignment(item.id)}
                    disabled={isToggling}
                    className={`ml-4 p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      isAssigned
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    aria-label={isAssigned ? 'Remove item from shop' : 'Add item to shop'}
                  >
                    {isToggling ? (
                      <LoadingSpinner size="sm" className={isAssigned ? 'text-white' : 'text-gray-700'} />
                    ) : (
                      <Check size={20} />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!selectedShop && (
        <div className="container-mobile py-6">
          <EmptyState
            icon={Package}
            title="Select a shop"
            description="Please select a shop from the dropdown above to assign items."
          />
        </div>
      )}
    </div>
  )
}
