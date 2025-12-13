'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../auth-provider'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Check, Save, Plus, Minus } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import HelpButton from '@/components/ui/HelpButton'
import UserManual from '@/components/ui/UserManual'

interface Shop {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

interface Item {
  id: string
  name: string
  pack_size: string
  category_id: string
  categories: Category
}

interface StockCount {
  item_id: string
  boxes: number
  singles: number
}

interface Session {
  id: string
  name: string
  status: string
}

export default function CountPage() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShop, setSelectedShop] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [counts, setCounts] = useState<Record<string, StockCount>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      fetchData()
    }
  }, [user, loading, router])

  async function fetchData() {
    try {
      setError(null)
      
      if (role === 'manager') {
        // Managers see all active sessions
        const { data: activeSessions, error: sessionsError } = await supabase
          .from('stock_count_sessions')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (sessionsError) throw sessionsError

        // If no active sessions, show all sessions
        if (!activeSessions || activeSessions.length === 0) {
          const { data: allSessions, error: allSessionsError } = await supabase
            .from('stock_count_sessions')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (allSessionsError) throw allSessionsError
          setSessions(allSessions || [])
        } else {
          setSessions(activeSessions || [])
        }
      } else {
        // Employees: Only show sessions they're assigned to
        // First, get sessions assigned to this user
        const { data: assignedSessions, error: assignedError } = await supabase
          .from('session_user_assignments')
          .select('session_id')
          .eq('user_id', user?.id || '')

        if (assignedError) throw assignedError

        // Get session IDs assigned to this user
        const assignedSessionIds = assignedSessions?.map((a: any) => a.session_id) || []

        if (assignedSessionIds.length > 0) {
          // Fetch only assigned active sessions
          const { data: userSessions, error: sessionsError } = await supabase
            .from('stock_count_sessions')
            .select('*')
            .eq('status', 'active')
            .in('id', assignedSessionIds)
            .order('created_at', { ascending: false })

          if (sessionsError) throw sessionsError
          setSessions(userSessions || [])
        } else {
          // If no assignments exist, show all active sessions (backward compatibility)
          // OR show none if you want strict assignment-only mode
          // For now, showing all active sessions if no assignments
          const { data: activeSessions, error: sessionsError } = await supabase
            .from('stock_count_sessions')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false })

          if (sessionsError) throw sessionsError
          setSessions(activeSessions || [])
        }
      }

      // Fetch user's assigned shops
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_shop_assignments')
        .select('*, shops(*)')
        .eq('user_id', user?.id)

      if (assignmentsError) throw assignmentsError

      const userShops =
        assignments?.map((a) => ({
          id: a.shop_id,
          name: (a.shops as any)?.name,
        })) || []

      // If manager, show all shops
      if (role === 'manager') {
        const { data: allShops, error: shopsError } = await supabase
          .from('shops')
          .select('*')
          .order('name')
        
        if (shopsError) throw shopsError
        setShops(allShops || [])
      } else {
        setShops(userShops)
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load data. Please refresh the page.')
    } finally {
      setLoadingData(false)
    }
  }

  async function fetchItemsForShop(shopId: string) {
    if (!shopId) {
      setItems([])
      return
    }

    try {
      setError(null)
      
      // Fetch items assigned to this shop
      const { data: shopItems, error: shopItemsError } = await supabase
        .from('shop_items')
        .select('item_id')
        .eq('shop_id', shopId)

      if (shopItemsError) throw shopItemsError

      const itemIds = shopItems?.map((si) => si.item_id) || []

      // If no shop-specific items, show all items
      let itemsQuery = supabase
        .from('items')
        .select('*, categories(*)')
        .order('name')

      if (itemIds.length > 0) {
        itemsQuery = itemsQuery.in('id', itemIds)
      }

      const { data: itemsData, error: itemsError } = await itemsQuery

      if (itemsError) throw itemsError
      setItems(itemsData || [])

      // Load existing counts if session is selected
      if (selectedSession) {
        await loadExistingCounts(selectedSession, shopId)
      } else {
        setCounts({})
      }
    } catch (err: any) {
      console.error('Error fetching items:', err)
      setError(err.message || 'Failed to load items for this shop.')
      setItems([])
    }
  }

  async function loadExistingCounts(sessionId: string, shopId: string) {
    try {
      const { data, error } = await supabase
        .from('stock_counts')
        .select('*')
        .eq('session_id', sessionId)
        .eq('shop_id', shopId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      const countsMap: Record<string, StockCount> = {}
      data?.forEach((count) => {
        countsMap[count.item_id] = {
          item_id: count.item_id,
          boxes: count.boxes || 0,
          singles: count.singles || 0,
        }
      })

      setCounts(countsMap)
    } catch (err: any) {
      console.error('Error loading existing counts:', err)
      // Don't show error for this, just start with empty counts
      setCounts({})
    }
  }

  useEffect(() => {
    if (selectedShop) {
      fetchItemsForShop(selectedShop)
    }
  }, [selectedShop, selectedSession])

  const updateCount = useCallback((itemId: string, field: 'boxes' | 'singles', value: number) => {
    // Validate input: ensure non-negative integer, cap at reasonable maximum
    const numValue = Math.max(0, Math.min(999999, Math.floor(value || 0)))
    
    setCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        item_id: itemId,
        [field]: numValue,
        boxes: field === 'boxes' ? numValue : (prev[itemId]?.boxes || 0),
        singles: field === 'singles' ? numValue : (prev[itemId]?.singles || 0),
      },
    }))
  }, [])

  const incrementCount = useCallback((itemId: string, field: 'boxes' | 'singles') => {
    setCounts((prev) => {
      const current = prev[itemId]?.[field] || 0
      const newValue = current + 1
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          item_id: itemId,
          [field]: newValue,
          boxes: field === 'boxes' ? newValue : (prev[itemId]?.boxes || 0),
          singles: field === 'singles' ? newValue : (prev[itemId]?.singles || 0),
        },
      }
    })
  }, [])

  const decrementCount = useCallback((itemId: string, field: 'boxes' | 'singles') => {
    setCounts((prev) => {
      const current = prev[itemId]?.[field] || 0
      if (current > 0) {
        const newValue = current - 1
        return {
          ...prev,
          [itemId]: {
            ...prev[itemId],
            item_id: itemId,
            [field]: newValue,
            boxes: field === 'boxes' ? newValue : (prev[itemId]?.boxes || 0),
            singles: field === 'singles' ? newValue : (prev[itemId]?.singles || 0),
          },
        }
      }
      return prev
    })
  }, [])

  async function saveCounts() {
    if (!selectedSession || !selectedShop) {
      toast.error('Please select a session and shop')
      return
    }

    if (!user?.id) {
      toast.error('You must be logged in to save counts')
      return
    }

    setSaving(true)
    const toastId = toast.loading('Saving counts...')

    try {
      // Validate session is still active
      const { data: sessionData, error: sessionError } = await supabase
        .from('stock_count_sessions')
        .select('status')
        .eq('id', selectedSession)
        .single()

      if (sessionError) throw sessionError

      if (sessionData?.status !== 'active') {
        toast.dismiss(toastId)
        toast.error('Cannot count for a completed session. Please select an active session.')
        setSaving(false)
        return
      }

      // Validate user has access to shop (for employees)
      if (role === 'employee') {
        const { data: assignment, error: assignmentError } = await supabase
          .from('user_shop_assignments')
          .select('id')
          .eq('user_id', user.id)
          .eq('shop_id', selectedShop)
          .single()

        if (assignmentError && assignmentError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is expected if no assignment
          throw assignmentError
        }

        if (!assignment) {
          toast.dismiss(toastId)
          toast.error('You do not have access to this shop. Please contact a manager.')
          setSaving(false)
          return
        }
      }

      // Validate and prepare counts
      const countsArray = Object.values(counts).filter((c) => {
        // Validate count values
        const boxes = Math.max(0, Math.min(999999, Math.floor(c.boxes || 0)))
        const singles = Math.max(0, Math.min(999999, Math.floor(c.singles || 0)))
        return boxes > 0 || singles > 0
      })

      if (countsArray.length === 0) {
        toast.dismiss(toastId)
        toast.error('No counts to save. Enter at least one count.')
        setSaving(false)
        return
      }

      // Prepare counts with validated values
      const countsToSave = countsArray.map((count) => ({
        session_id: selectedSession,
        shop_id: selectedShop,
        item_id: count.item_id,
        boxes: Math.max(0, Math.min(999999, Math.floor(count.boxes || 0))),
        singles: Math.max(0, Math.min(999999, Math.floor(count.singles || 0))),
        counted_by: user.id,
      }))

      // Use UPSERT instead of delete-then-insert to prevent race conditions
      // This ensures atomic operation - no window where data can be lost
      const { error: upsertError } = await supabase
        .from('stock_counts')
        .upsert(countsToSave, {
          onConflict: 'session_id,shop_id,item_id',
          ignoreDuplicates: false,
        })

      if (upsertError) throw upsertError

      toast.dismiss(toastId)
      toast.success(`Successfully saved ${countsArray.length} item count(s)!`)
      
      // Reload existing counts to reflect any changes from other users
      await loadExistingCounts(selectedSession, selectedShop)
    } catch (error: any) {
      toast.dismiss(toastId)
      console.error('Error saving counts:', error)
      toast.error('Error saving counts: ' + (error.message || 'Unknown error occurred'))
    } finally {
      setSaving(false)
    }
  }

  const getItemsByCategory = useCallback((categoryId: string) => {
    return items.filter((item) => item.category_id === categoryId)
  }, [items])

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={24} />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Count Stock</h1>
            </div>
            <HelpButton onClick={() => setShowManual(true)} />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => {
                  setSelectedSession(e.target.value)
                  setCounts({})
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="">
                  {sessions.length === 0 
                    ? role === 'manager' 
                      ? 'No sessions - Create one in Sessions' 
                      : 'No assigned sessions available'
                    : 'Select a session'}
                </option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name} {session.status !== 'active' ? `(${session.status})` : ''}
                  </option>
                ))}
              </select>
              {sessions.length === 0 && role === 'manager' && (
                <p className="text-xs text-gray-500 mt-1">
                  <Link href="/dashboard/sessions" className="text-primary-600 hover:underline">
                    Go to Sessions
                  </Link> to create a new stock count session
                </p>
              )}
              {sessions.length === 0 && role !== 'manager' && (
                <p className="text-xs text-gray-500 mt-1">
                  No sessions assigned to you. Please contact a manager to assign you to a session.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop
              </label>
              <select
                value={selectedShop}
                onChange={(e) => {
                  setSelectedShop(e.target.value)
                  setCounts({})
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                disabled={!selectedSession}
              >
                <option value="">
                  {shops.length === 0
                    ? role === 'manager'
                      ? 'No shops available'
                      : 'No shops assigned to you'
                    : 'Select a shop'}
                </option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              {shops.length === 0 && role === 'manager' && (
                <p className="text-xs text-gray-500 mt-1">
                  <Link href="/dashboard/shops" className="text-primary-600 hover:underline">
                    Go to Shops
                  </Link> to add shop locations
                </p>
              )}
              {shops.length === 0 && role !== 'manager' && (
                <p className="text-xs text-gray-500 mt-1">
                  No shops assigned. Please contact a manager to assign shops to your account.
                </p>
              )}
              {!selectedSession && shops.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Please select a session first
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedSession && selectedShop && items.length > 0 && (
        <div className="container-mobile py-6">
          {categories.map((category) => {
            const categoryItems = getItemsByCategory(category.id)
            if (categoryItems.length === 0) return null

            return (
              <div key={category.id} className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 bg-white p-3 rounded-lg shadow-sm border">
                  {category.name}
                </h2>
                <div className="space-y-3">
                  {categoryItems.map((item) => {
                    const count = counts[item.id] || {
                      item_id: item.id,
                      boxes: 0,
                      singles: 0,
                    }

                    return (
                      <div
                        key={item.id}
                        className="bg-white p-4 rounded-lg shadow-sm border"
                      >
                        <div className="mb-3">
                          <h3 className="font-semibold text-gray-900">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Pack Size: {item.pack_size}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Boxes
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => decrementCount(item.id, 'boxes')}
                                disabled={(count.boxes || 0) === 0}
                                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg border-2 border-gray-200 transition-all active:scale-95"
                                aria-label="Decrease boxes"
                              >
                                <Minus size={18} />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="999999"
                                value={count.boxes ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '') {
                                    updateCount(item.id, 'boxes', 0)
                                  } else {
                                    const numValue = Number(value)
                                    if (!isNaN(numValue)) {
                                      updateCount(item.id, 'boxes', numValue)
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 text-lg placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => incrementCount(item.id, 'boxes')}
                                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg border-2 border-primary-200 transition-all active:scale-95"
                                aria-label="Increase boxes"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Singles
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => decrementCount(item.id, 'singles')}
                                disabled={(count.singles || 0) === 0}
                                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg border-2 border-gray-200 transition-all active:scale-95"
                                aria-label="Decrease singles"
                              >
                                <Minus size={18} />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max="999999"
                                value={count.singles ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '') {
                                    updateCount(item.id, 'singles', 0)
                                  } else {
                                    const numValue = Number(value)
                                    if (!isNaN(numValue)) {
                                      updateCount(item.id, 'singles', numValue)
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl bg-white text-gray-900 text-lg placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => incrementCount(item.id, 'singles')}
                                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg border-2 border-primary-200 transition-all active:scale-95"
                                aria-label="Increase singles"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="sticky bottom-0 bg-white border-t p-4 -mx-4 sm:mx-0 sm:rounded-lg sm:border sm:mt-6">
            <button
              onClick={saveCounts}
              disabled={saving || !selectedSession || !selectedShop}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  Saving to database...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Counts
                </>
              )}
            </button>
            {saving && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Your counts are being saved to the database...
              </p>
            )}
          </div>
        </div>
      )}

      {selectedSession && selectedShop && items.length === 0 && (
        <div className="container-mobile py-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <p className="text-gray-600">
              No items found for this shop. Please contact a manager to assign items.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="container-mobile py-6">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!error && (!selectedSession || !selectedShop) && (
        <div className="container-mobile py-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            {!selectedSession && sessions.length === 0 ? (
              <div className="space-y-2">
                <p className="text-gray-900 font-medium">
                  {role === 'manager' 
                    ? 'No stock count sessions found'
                    : 'No sessions assigned to you'}
                </p>
                <p className="text-gray-600 text-sm">
                  {role === 'manager' ? (
                    <>
                      Create a new session in{' '}
                      <Link href="/dashboard/sessions" className="text-primary-600 hover:underline">
                        Stock Count Sessions
                      </Link>
                    </>
                  ) : (
                    'Please contact a manager to assign you to a stock count session.'
                  )}
                </p>
              </div>
            ) : !selectedShop && shops.length === 0 ? (
              <div className="space-y-2">
                <p className="text-gray-900 font-medium">
                  {role === 'manager' 
                    ? 'No shops found'
                    : 'No shops assigned'}
                </p>
                <p className="text-gray-600 text-sm">
                  {role === 'manager' ? (
                    <>
                      Add shops in{' '}
                      <Link href="/dashboard/shops" className="text-primary-600 hover:underline">
                        Shops
                      </Link>
                    </>
                  ) : (
                    'Please contact a manager to assign shops to your account.'
                  )}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">
                Please select a session and shop to start counting.
              </p>
            )}
          </div>
        </div>
      )}

      <UserManual isOpen={showManual} onClose={() => setShowManual(false)} initialSection="counting" />
    </div>
  )
}

