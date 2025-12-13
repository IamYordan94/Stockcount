'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../auth-provider'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Search, Users as UsersIcon } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import HelpButton from '@/components/ui/HelpButton'
import UserManual from '@/components/ui/UserManual'
import type { Shop } from '@/types'

interface User {
  id: string
  email: string
  name: string
  role: string
  shops: { id: string; name: string }[]
}

export default function UsersPage() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userRole, setUserRole] = useState<'manager' | 'employee'>('employee')
  const [selectedShops, setSelectedShops] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
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
      fetchData()
    }
  }, [user, loading, role, router])

  async function fetchData() {
    try {
      setLoadingData(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (!session) {
        console.error('No session found:', sessionError)
        toast.error('You must be logged in to view users')
        setLoadingData(false)
        return
      }

      // Session validated, proceed with API call

      const response = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(errorData.error || `Error fetching users: ${response.status}`)
      }

      const { users: usersData } = await response.json()
      setUsers(usersData || [])

      const { data: shopsData, error: shopsError } = await supabase.from('shops').select('*').order('name')

      if (shopsError) {
        console.error('Error fetching shops:', shopsError)
        toast.error('Error loading shops: ' + (shopsError.message || 'Unknown error occurred'))
        setShops([])
      } else {
        setShops(shopsData || [])
      }
    } catch (err: any) {
      console.error('Error fetching data:', err)
      toast.error('Error loading data: ' + (err.message || 'Unknown error occurred'))
      setUsers([])
      setShops([])
    } finally {
      setLoadingData(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = !roleFilter || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  async function saveUser() {
    if (!userEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }
    if (!userName.trim()) {
      toast.error('Please enter a name')
      return
    }

    setSaving(true)
    const toastId = toast.loading(editingUser ? 'Updating user...' : 'Creating user...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.dismiss(toastId)
        toast.error('You must be logged in')
        return
      }

      if (editingUser) {
        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: editingUser.id,
            password: userPassword.trim() || undefined,
            role: userRole,
            name: userName.trim(),
            shopIds: userRole === 'employee' ? selectedShops : [],
          }),
        })

        if (!response.ok) {
          const { error } = await response.json()
          throw new Error(error)
        }
        toast.dismiss(toastId)
        toast.success('User updated successfully!')
      } else {
        if (!userPassword.trim()) {
          toast.dismiss(toastId)
          toast.error('Password is required for new users')
          setSaving(false)
          return
        }

        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: userEmail,
            password: userPassword,
            role: userRole,
            name: userName.trim(),
            shopIds: userRole === 'employee' ? selectedShops : [],
          }),
        })

        if (!response.ok) {
          const { error } = await response.json()
          throw new Error(error)
        }
        toast.dismiss(toastId)
        toast.success('User created successfully!')
      }

      setShowUserModal(false)
      setEditingUser(null)
      setUserEmail('')
      setUserName('')
      setUserPassword('')
      setUserRole('employee')
      setSelectedShops([])
      fetchData()
    } catch (error: any) {
      toast.dismiss(toastId)
      toast.error('Error saving user: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser() {
    if (!userToDelete) return

    setDeleting(true)
    const toastId = toast.loading('Deleting user...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.dismiss(toastId)
        toast.error('You must be logged in')
        return
      }

      const response = await fetch(`/api/admin/users?userId=${userToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error)
      }

      toast.dismiss(toastId)
      toast.success('User deleted successfully!')
      fetchData()
    } catch (error: any) {
      toast.dismiss(toastId)
      toast.error('Error deleting user: ' + error.message)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setUserToDelete(null)
    }
  }

  function openEditModal(user: User) {
    setEditingUser(user)
    setUserEmail(user.email)
    setUserName(user.name || '')
    setUserPassword('')
    setUserRole(user.role as 'manager' | 'employee')
    setSelectedShops(user.shops.map((s) => s.id))
    setShowUserModal(true)
  }

  function openCreateModal() {
    setEditingUser(null)
    setUserEmail('')
    setUserName('')
    setUserPassword('')
    setUserRole('employee')
    setSelectedShops([])
    setShowUserModal(true)
  }

  function handleDeleteClick(userId: string) {
    setUserToDelete(userId)
    setShowDeleteDialog(true)
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">Users</h1>
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
          Add User
        </button>

        {/* Search and Filter */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by email..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          >
            <option value="">All Roles</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        {filteredUsers.length === 0 && !loadingData && (
          <EmptyState
            icon={UsersIcon}
            title={searchQuery || roleFilter ? 'No users found' : 'No users yet'}
            description={
              searchQuery || roleFilter
                ? 'Try adjusting your search or filter criteria.'
                : 'Add your first user to get started.'
            }
            action={
              !searchQuery && !roleFilter
                ? {
                    label: 'Add User',
                    onClick: openCreateModal,
                  }
                : undefined
            }
          />
        )}

        <div className="space-y-4">
          {filteredUsers.map((u, index) => (
            <div 
              key={u.id} 
              className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">{u.name || u.email}</h3>
                  {u.name && <p className="text-xs text-gray-500 mb-2">{u.email}</p>}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Role: <span className="capitalize font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{u.role}</span>
                    </p>
                    {u.shops.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Shops: <span className="text-gray-900 font-medium">{u.shops.map((s) => s.name).join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                    aria-label="Edit user"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(u.id)}
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete user"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false)
          setEditingUser(null)
          setUserEmail('')
          setUserName('')
          setUserPassword('')
          setUserRole('employee')
          setSelectedShops([])
        }}
        title={editingUser ? 'Edit User' : 'Add User'}
        size="md"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="John Doe"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">This name will be displayed instead of email</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="user@example.com"
              disabled={!!editingUser}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password {editingUser && <span className="text-gray-500 font-normal">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              placeholder="Enter password"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as 'manager' | 'employee')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          {userRole === 'employee' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Assigned Shops</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50">
                {shops.map((shop) => (
                  <label key={shop.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedShops.includes(shop.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedShops([...selectedShops, shop.id])
                        } else {
                          setSelectedShops(selectedShops.filter((id) => id !== shop.id))
                        }
                      }}
                      className="rounded w-4 h-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900">{shop.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={saveUser}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                {editingUser ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingUser ? 'Update' : 'Create'
            )}
          </button>
          <button
            onClick={() => {
              setShowUserModal(false)
              setEditingUser(null)
              setUserEmail('')
              setUserPassword('')
              setUserRole('employee')
              setSelectedShops([])
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
          setUserToDelete(null)
        }}
        onConfirm={deleteUser}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  )
}
