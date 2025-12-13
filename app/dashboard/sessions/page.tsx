'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../auth-provider'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, Download, CheckCircle, Circle, X, Trash2, History, Clock, Users } from 'lucide-react'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import HelpButton from '@/components/ui/HelpButton'
import UserManual from '@/components/ui/UserManual'
import type { StockCountSession } from '@/types'

type TabType = 'active' | 'completed'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export default function SessionsPage() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [sessions, setSessions] = useState<StockCountSession[]>([])
  const [sessionAssignments, setSessionAssignments] = useState<Map<string, User[]>>(new Map())
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [completingSession, setCompletingSession] = useState<string | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [sessionToComplete, setSessionToComplete] = useState<string | null>(null)
  const [generatingExcel, setGeneratingExcel] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
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
      fetchUsers()
      fetchSessions()
    }
  }, [user, loading, role, router])

  async function fetchUsers() {
    try {
      setLoadingUsers(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const { users } = await response.json()
        // Filter to only employees (not managers)
        const employees = users.filter((u: User) => u.role === 'employee')
        setAllUsers(employees)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function fetchSessions() {
    try {
      setLoadingSessions(true)
      const { data, error } = await supabase
        .from('stock_count_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        toast.error('Error loading sessions: ' + (error.message || 'Unknown error occurred'))
        setSessions([])
      } else {
        setSessions(data || [])
        // Fetch assignments for all sessions
        if (data && data.length > 0) {
          await fetchSessionAssignments(data.map((s) => s.id))
        }
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err)
      toast.error('Error loading sessions: ' + err.message)
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  async function fetchSessionAssignments(sessionIds: string[]) {
    try {
      const { data, error } = await supabase
        .from('session_user_assignments')
        .select('session_id, user_id')
        .in('session_id', sessionIds)

      if (error) {
        console.error('Error fetching assignments:', error)
        return
      }

      if (!data || data.length === 0) {
        setSessionAssignments(new Map())
        return
      }

      // Get user details for assigned users
      const userIds = new Set<string>()
      data?.forEach((a: any) => {
        if (a.user_id) userIds.add(a.user_id)
      })

      if (userIds.size === 0) {
        setSessionAssignments(new Map())
        return
      }

      // Fetch user details via API
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const { users } = await response.json()
        const userMap = new Map(users.map((u: User) => [u.id, u]))

        // Build assignments map
        const assignmentsMap = new Map<string, User[]>()
        data?.forEach((a: any) => {
          if (!assignmentsMap.has(a.session_id)) {
            assignmentsMap.set(a.session_id, [])
          }
          const user = userMap.get(a.user_id)
          if (user) {
            assignmentsMap.get(a.session_id)?.push(user)
          }
        })

        setSessionAssignments(assignmentsMap)
      }
    } catch (err) {
      console.error('Error fetching session assignments:', err)
    }
  }

  const filteredSessions = useMemo(() => {
    if (activeTab === 'active') {
      return sessions.filter((s) => s.status === 'active')
    } else {
      return sessions.filter((s) => s.status === 'completed')
    }
  }, [sessions, activeTab])

  async function createSession() {
    if (!sessionName.trim()) {
      toast.error('Please enter a session name')
      return
    }

    const toastId = toast.loading('Creating session...')

    try {
      // Create session
      const { data: newSession, error: sessionError } = await supabase
        .from('stock_count_sessions')
        .insert({
          name: sessionName,
          status: 'active',
          created_by: user?.id,
        })
        .select()
        .single()

      if (sessionError) {
        toast.dismiss(toastId)
        toast.error(`Error creating session: ${sessionError.message}`)
        return
      }

      // Assign users if any selected
      if (selectedUserIds.length > 0 && newSession) {
        const assignments = selectedUserIds.map((userId) => ({
          session_id: newSession.id,
          user_id: userId,
        }))

        const { error: assignError } = await supabase
          .from('session_user_assignments')
          .insert(assignments)

        if (assignError) {
          console.error('Error assigning users:', assignError)
          // Don't fail the whole operation, just log it
        }
      }

      toast.dismiss(toastId)
      toast.success('Session created successfully!')
      setShowCreateModal(false)
      setSessionName('')
      setSelectedUserIds([])
      fetchSessions()
      setActiveTab('active') // Switch to active tab to see new session
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Unexpected error creating session:', err)
      toast.error('Unexpected error: ' + (err.message || 'Unknown error occurred'))
    }
  }

  async function completeSession(sessionId: string) {
    setCompletingSession(sessionId)
    const toastId = toast.loading('Completing session...')

    try {
      // Verify session exists and is active
      const { data: sessionData, error: checkError } = await supabase
        .from('stock_count_sessions')
        .select('status')
        .eq('id', sessionId)
        .single()

      if (checkError) throw checkError

      if (sessionData?.status !== 'active') {
        toast.dismiss(toastId)
        toast.error('Session is already completed or archived.')
        setCompletingSession(null)
        setShowCompleteDialog(false)
        setSessionToComplete(null)
        return
      }

      const { error } = await supabase
        .from('stock_count_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('status', 'active') // Only update if still active (prevent race condition)

      if (error) {
        toast.dismiss(toastId)
        toast.error('Error completing session: ' + (error.message || 'Unknown error occurred'))
      } else {
        toast.dismiss(toastId)
        toast.success('Session completed successfully!')
        fetchSessions()
        setActiveTab('completed') // Switch to completed tab to see the completed session
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Error completing session:', err)
      toast.error('Error: ' + (err.message || 'Unknown error occurred'))
    } finally {
      setCompletingSession(null)
      setShowCompleteDialog(false)
      setSessionToComplete(null)
    }
  }

  async function deleteSession() {
    if (!sessionToDelete) return

    setDeleting(true)
    const toastId = toast.loading('Deleting session...')

    try {
      // Delete all stock counts for this session first (cascade should handle this, but being explicit)
      const { error: countsError } = await supabase
        .from('stock_counts')
        .delete()
        .eq('session_id', sessionToDelete)

      if (countsError) {
        console.warn('Error deleting counts:', countsError)
        // Continue anyway
      }

      // Delete session assignments
      const { error: assignError } = await supabase
        .from('session_user_assignments')
        .delete()
        .eq('session_id', sessionToDelete)

      if (assignError) {
        console.warn('Error deleting assignments:', assignError)
        // Continue anyway
      }

      // Delete the session
      const { error } = await supabase
        .from('stock_count_sessions')
        .delete()
        .eq('id', sessionToDelete)

      if (error) {
        toast.dismiss(toastId)
        toast.error('Error deleting session: ' + (error.message || 'Unknown error occurred'))
      } else {
        toast.dismiss(toastId)
        toast.success('Session deleted successfully!')
        fetchSessions()
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Error deleting session:', err)
      toast.error('Error: ' + (err.message || 'Unknown error occurred'))
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setSessionToDelete(null)
    }
  }

  async function downloadExcel(sessionId: string, sessionName: string) {
    setGeneratingExcel(sessionId)
    const toastId = toast.loading('Generating Excel file...')

    try {
      // Fetch all shops
      const { data: shops, error: shopsError } = await supabase.from('shops').select('*').order('name')

      if (shopsError) {
        toast.dismiss(toastId)
        toast.error('Error fetching shops: ' + shopsError.message)
        setGeneratingExcel(null)
        return
      }

      if (!shops || shops.length === 0) {
        toast.dismiss(toastId)
        toast.error('No shops found')
        setGeneratingExcel(null)
        return
      }

      // Fetch all categories
      const { data: categories, error: categoriesError } = await supabase.from('categories').select('*').order('name')

      if (categoriesError) {
        toast.dismiss(toastId)
        toast.error('Error fetching categories: ' + categoriesError.message)
        setGeneratingExcel(null)
        return
      }

      // Fetch shop_items to filter items per shop
      const { data: shopItems, error: shopItemsError } = await supabase
        .from('shop_items')
        .select('shop_id, item_id')

      if (shopItemsError) {
        toast.dismiss(toastId)
        toast.error('Error fetching shop items: ' + shopItemsError.message)
        setGeneratingExcel(null)
        return
      }

      // Create a map: shop_id -> Set of item_ids
      const shopItemsMap = new Map<string, Set<string>>()
      shopItems?.forEach((si) => {
        if (!shopItemsMap.has(si.shop_id)) {
          shopItemsMap.set(si.shop_id, new Set())
        }
        shopItemsMap.get(si.shop_id)?.add(si.item_id)
      })

      // Fetch all items with categories
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*, categories(*)')
        .order('name')

      if (itemsError) {
        toast.dismiss(toastId)
        toast.error('Error fetching items: ' + itemsError.message)
        setGeneratingExcel(null)
        return
      }

      // Fetch stock counts for this session
      const { data: counts, error: countsError } = await supabase
        .from('stock_counts')
        .select('*, items(*), shops(*)')
        .eq('session_id', sessionId)

      if (countsError) {
        toast.dismiss(toastId)
        toast.error('Error fetching counts: ' + countsError.message)
        setGeneratingExcel(null)
        return
      }

      // Create a map for quick lookup
      const countsMap = new Map()
      counts?.forEach((count) => {
        const key = `${count.shop_id}-${count.item_id}`
        countsMap.set(key, { boxes: count.boxes, singles: count.singles })
      })

      // Create workbook
      const workbook = XLSX.utils.book_new()

      // Create a sheet for each shop
      shops.forEach((shop) => {
        // Filter items assigned to this shop
        const shopItemIds = shopItemsMap.get(shop.id) || new Set()
        const shopItemsFiltered = items?.filter((item) => shopItemIds.has(item.id)) || []

        // Group items by category
        const itemsByCategory = new Map()
        categories?.forEach((cat) => {
          itemsByCategory.set(cat.id, {
            category: cat,
            items: shopItemsFiltered.filter((item) => item.category_id === cat.id),
          })
        })

        // Prepare sheet data
        const sheetData: any[] = []

        categories?.forEach((cat) => {
          const categoryData = itemsByCategory.get(cat.id)
          if (!categoryData || categoryData.items.length === 0) return

          // Category header
          sheetData.push([cat.name])
          sheetData.push(['Item Name', 'Pack Size', 'Boxes', 'Singles'])

          // Items in this category
          categoryData.items.forEach((item: any) => {
            const key = `${shop.id}-${item.id}`
            const count = countsMap.get(key) || { boxes: 0, singles: 0 }
            sheetData.push([item.name, item.pack_size, count.boxes, count.singles])
          })

          // Empty row between categories
          sheetData.push([])
        })

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
        XLSX.utils.book_append_sheet(workbook, worksheet, shop.name)
      })

      // Download
      XLSX.writeFile(workbook, `${sessionName}.xlsx`)
      toast.dismiss(toastId)
      toast.success('Excel file downloaded successfully!')
    } catch (err: any) {
      toast.dismiss(toastId)
      console.error('Error generating Excel:', err)
      toast.error('Error generating Excel file: ' + (err.message || 'Unknown error occurred'))
    } finally {
      setGeneratingExcel(null)
    }
  }

  function handleDeleteClick(sessionId: string) {
    setSessionToDelete(sessionId)
    setShowDeleteDialog(true)
  }

  if (loading || loadingSessions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Stock Count Sessions</h1>
            </div>
            <HelpButton onClick={() => setShowManual(true)} />
          </div>
        </div>
      </div>

      <div className="container-mobile py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-white/20">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-primary-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Clock size={18} />
            Active Sessions
            {sessions.filter((s) => s.status === 'active').length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {sessions.filter((s) => s.status === 'active').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-primary-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <History size={18} />
            History
            {sessions.filter((s) => s.status === 'completed').length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {sessions.filter((s) => s.status === 'completed').length}
              </span>
            )}
          </button>
        </div>

        {/* Create Button - Only show on Active tab */}
        {activeTab === 'active' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="mb-6 w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-primary-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-primary-600 hover:to-indigo-700 transition-all shadow-glow hover:shadow-glow-lg font-medium group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Create New Session
          </button>
        )}

        {/* Empty States */}
        {filteredSessions.length === 0 && !loadingSessions && (
          <EmptyState
            icon={activeTab === 'active' ? Clock : History}
            title={activeTab === 'active' ? 'No active sessions' : 'No completed sessions'}
            description={
              activeTab === 'active'
                ? 'Create a new session to start counting stock.'
                : 'Completed sessions will appear here. Complete an active session to add it to history.'
            }
            action={
              activeTab === 'active'
                ? {
                    label: 'Create Session',
                    onClick: () => setShowCreateModal(true),
                  }
                : undefined
            }
          />
        )}

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const assignedUsers = sessionAssignments.get(session.id) || []
            return (
              <div
                key={session.id}
                className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{session.name}</h3>
                      {session.status === 'active' ? (
                        <Circle className="text-green-500" size={18} />
                      ) : (
                        <CheckCircle className="text-gray-400" size={18} />
                      )}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                          session.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {session.status === 'active' ? 'Active' : 'Completed'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Created:</span>{' '}
                        {format(new Date(session.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                      {session.completed_at && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Completed:</span>{' '}
                          {format(new Date(session.completed_at), 'MMM d, yyyy • h:mm a')}
                        </p>
                      )}
                      {assignedUsers.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Assigned to: <span className="font-medium text-gray-700">{assignedUsers.map(u => u.name || u.email).join(', ')}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {session.status === 'active' && (
                      <button
                        onClick={() => {
                          setSessionToComplete(session.id)
                          setShowCompleteDialog(true)
                        }}
                        disabled={completingSession === session.id}
                        className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-4 py-2 rounded-xl hover:from-yellow-600 hover:to-amber-700 text-sm font-medium disabled:opacity-50 transition-all shadow-md"
                      >
                        {completingSession === session.id ? (
                          <>
                            <LoadingSpinner size="sm" className="text-white" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            Complete
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => downloadExcel(session.id, session.name)}
                      disabled={generatingExcel === session.id}
                      className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-primary-600 hover:to-indigo-700 text-sm font-medium disabled:opacity-50 transition-all shadow-md"
                    >
                      {generatingExcel === session.id ? (
                        <>
                          <LoadingSpinner size="sm" className="text-white" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Download Excel
                        </>
                      )}
                    </button>
                    {session.status === 'completed' && (
                      <button
                        onClick={() => handleDeleteClick(session.id)}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 text-sm font-medium transition-all shadow-md"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSessionName('')
          setSelectedUserIds([])
        }}
        title="Create New Session"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Session Name *</label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., January 2024"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              onKeyPress={(e) => e.key === 'Enter' && createSession()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assign Users (Optional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select which users can count for this session. If no users are selected, all employees can access this session.
            </p>
            {loadingUsers ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : allUsers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No employees found. Add employees in the Users page first.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
                {allUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds([...selectedUserIds, u.id])
                        } else {
                          setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id))
                        }
                      }}
                      className="rounded w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{u.name || u.email}</span>
                      {u.name && <span className="text-xs text-gray-500 ml-2">({u.email})</span>}
                      {(u as any).shops && (u as any).shops.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Shops: {(u as any).shops.map((s: any) => s.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={createSession}
              className="flex-1 bg-gradient-to-r from-primary-500 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-primary-600 hover:to-indigo-700 transition-all font-medium shadow-md"
            >
              Create Session
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false)
                setSessionName('')
                setSelectedUserIds([])
              }}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-xl hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Complete Dialog */}
      <ConfirmDialog
        isOpen={showCompleteDialog}
        onClose={() => {
          setShowCompleteDialog(false)
          setSessionToComplete(null)
        }}
        onConfirm={() => {
          if (sessionToComplete) {
            completeSession(sessionToComplete)
          }
        }}
        title="Complete Session"
        message="Are you sure you want to complete this session? No new counts can be added after completion. The session will be moved to History."
        confirmLabel="Complete Session"
        variant="default"
        isLoading={completingSession !== null}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setSessionToDelete(null)
        }}
        onConfirm={deleteSession}
        title="Delete Session"
        message="Are you sure you want to delete this session? This will permanently delete the session and all its stock count data. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />

      <UserManual isOpen={showManual} onClose={() => setShowManual(false)} initialSection="sessions" />
    </div>
  )
}
