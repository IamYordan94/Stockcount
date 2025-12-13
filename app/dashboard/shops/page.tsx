'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../auth-provider'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Search, Store } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import HelpButton from '@/components/ui/HelpButton'
import UserManual from '@/components/ui/UserManual'
import type { Shop } from '@/types'

export default function ShopsPage() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [shops, setShops] = useState<Shop[]>([])
  const [loadingShops, setLoadingShops] = useState(true)
  const [showShopModal, setShowShopModal] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [shopName, setShopName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [shopToDelete, setShopToDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showManual, setShowManual] = useState(false)

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
      fetchShops()
    }
  }, [user, loading, role, router])

  async function fetchShops() {
    try {
      setLoadingShops(true)
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching shops:', error)
        toast.error('Error loading shops: ' + (error.message || 'Unknown error occurred'))
        setShops([])
      } else {
        setShops(data || [])
      }
    } catch (err: any) {
      console.error('Error fetching shops:', err)
      toast.error('Error loading shops: ' + (err.message || 'Unknown error occurred'))
      setShops([])
    } finally {
      setLoadingShops(false)
    }
  }

  const filteredShops = useMemo(() => {
    return shops.filter((shop) =>
      shop.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [shops, searchQuery])

  async function saveShop() {
    if (!shopName.trim()) {
      toast.error('Please enter a shop name')
      return
    }

    setSaving(true)
    const toastId = toast.loading(editingShop ? 'Updating shop...' : 'Creating shop...')

    try {
      let shopId: string

      if (editingShop) {
        const { data, error } = await supabase
          .from('shops')
          .update({ name: shopName })
          .eq('id', editingShop.id)
          .select()
          .single()

        if (error) {
          toast.dismiss(toastId)
          toast.error(`Error updating shop: ${error.message}`)
          return
        }
        toast.dismiss(toastId)
        toast.success('Shop updated successfully!')
      } else {
        const { error } = await supabase.from('shops').insert({ name: shopName })

        if (error) {
          toast.dismiss(toastId)
          toast.error(`Error creating shop: ${error.message}`)
          return
        }

        toast.dismiss(toastId)
        toast.success('Shop created successfully!')
      }

      setShowShopModal(false)
      setEditingShop(null)
      setShopName('')
      fetchShops()
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Unexpected error saving shop:', err)
      toast.error('Unexpected error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }


  async function deleteShop() {
    if (!shopToDelete) return

    setDeleting(true)
    const toastId = toast.loading('Deleting shop...')

    try {
      const { error } = await supabase.from('shops').delete().eq('id', shopToDelete)

      if (error) {
        toast.dismiss(toastId)
        toast.error('Error deleting shop: ' + error.message)
      } else {
        toast.dismiss(toastId)
        toast.success('Shop deleted successfully!')
        fetchShops()
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error('Error: ' + err.message)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setShopToDelete(null)
    }
  }

  function openEditModal(shop: Shop) {
    setEditingShop(shop)
    setShopName(shop.name)
    setShowShopModal(true)
  }

  function openCreateModal() {
    setEditingShop(null)
    setShopName('')
    setShowShopModal(true)
  }

  function handleDeleteClick(shopId: string) {
    setShopToDelete(shopId)
    setShowDeleteDialog(true)
  }

  if (loading || loadingShops) {
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Shops</h1>
            </div>
            <HelpButton onClick={() => setShowManual(true)} />
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        <button
          onClick={openCreateModal}
          className="mb-6 w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-primary-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-primary-600 hover:to-indigo-700 transition-all shadow-glow hover:shadow-glow-lg font-medium group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          Add Shop
        </button>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shops..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        {filteredShops.length === 0 && !loadingShops && (
          <EmptyState
            icon={Store}
            title={searchQuery ? 'No shops found' : 'No shops yet'}
            description={
              searchQuery
                ? 'Try adjusting your search criteria.'
                : 'Add your first shop to get started.'
            }
            action={
              !searchQuery
                ? {
                    label: 'Add Shop',
                    onClick: openCreateModal,
                  }
                : undefined
            }
          />
        )}

        <div className="space-y-4">
          {filteredShops.map((shop, index) => (
            <div
              key={shop.id}
              className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover flex items-center justify-between animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <h3 className="font-semibold text-gray-900 text-lg">{shop.name}</h3>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openEditModal(shop)}
                  className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                  aria-label="Edit shop"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDeleteClick(shop.id)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Delete shop"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showShopModal}
        onClose={() => {
          setShowShopModal(false)
          setEditingShop(null)
          setShopName('')
        }}
        title={editingShop ? 'Edit Shop' : 'Add Shop'}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Shop Name *</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Enter shop name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              onKeyPress={(e) => e.key === 'Enter' && !saving && saveShop()}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              To manage products for this shop, use the "See Products per Shop" feature on the Products page.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={saveShop}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                {editingShop ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingShop ? 'Update Shop' : 'Create Shop'
            )}
          </button>
          <button
            onClick={() => {
              setShowShopModal(false)
              setEditingShop(null)
              setShopName('')
            }}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setShopToDelete(null)
        }}
        onConfirm={deleteShop}
        title="Delete Shop"
        message="Are you sure you want to delete this shop? This will also remove all item assignments and stock counts for this shop. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />

      <UserManual isOpen={showManual} onClose={() => setShowManual(false)} initialSection="shops" />
    </div>
  )
}
