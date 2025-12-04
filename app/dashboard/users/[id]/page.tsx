'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Key } from 'lucide-react'

interface User {
  id: string
  email: string
  role: string | null
  shop_id: string | null
  must_change_password: boolean
  assigned_shops: Array<{ shop_id: string; shop_name: string }>
}

interface Shop {
  id: string
  name: string
}

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedShops, setSelectedShops] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const fetchData = async () => {
    try {
      const [userRes, shopsRes] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch('/api/shops'), // We'll need to create this endpoint
      ])

      if (!userRes.ok) throw new Error('Failed to fetch user')
      const userData = await userRes.json()
      setUser(userData)
      setSelectedShops(userData.assigned_shops.map((s: any) => s.shop_id))

      if (shopsRes.ok) {
        const shopsData = await shopsRes.json()
        setShops(shopsData.shops || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAssignments = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/${userId}/assign-shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_ids: selectedShops }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save assignments')
      }

      alert('Shop assignments updated successfully!')
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!confirm('Generate a new temporary password for this user?')) return

    setResetting(true)
    setError(null)
    setTempPassword(null)

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reset password')
      }

      const data = await response.json()
      setTempPassword(data.temporary_password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!user) {
    return <div className="text-red-600">User not found</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/users" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Users
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit User: {user.email}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Password Reset Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Password Management</h2>
          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            <Key className="h-5 w-5 mr-2" />
            {resetting ? 'Generating...' : 'Reset Password'}
          </button>
          {tempPassword && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Temporary Password (share this with the user):
              </p>
              <p className="text-lg font-mono bg-white p-2 rounded border">{tempPassword}</p>
              <p className="text-xs text-yellow-700 mt-2">
                User will be required to change this password on next login.
              </p>
            </div>
          )}
        </div>

        {/* Shop Assignments Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Shop Assignments</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select shops this user can access. Users will only see shops they are assigned to.
          </p>

          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded p-4">
            {shops.map((shop) => (
              <label key={shop.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedShops.includes(shop.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedShops([...selectedShops, shop.id])
                    } else {
                      setSelectedShops(selectedShops.filter(id => id !== shop.id))
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{shop.name}</span>
              </label>
            ))}
            {shops.length === 0 && (
              <p className="text-sm text-gray-500">No shops available. Import shops first.</p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveAssignments}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
