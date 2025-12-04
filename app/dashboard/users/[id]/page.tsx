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


export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const fetchData = async () => {
    try {
      const userRes = await fetch(`/api/users/${userId}`)

      if (!userRes.ok) throw new Error('Failed to fetch user')
      const userData = await userRes.json()
      setUser(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
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

        {/* Note about shop assignments */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Shop assignments are managed through Stock Count Periods. 
            When you create a stock count period, you can assign specific shops to users for that period.
          </p>
        </div>
      </div>
    </div>
  )
}
