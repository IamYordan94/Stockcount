'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Users, Store } from 'lucide-react'

interface User {
  id: string
  email: string
  user_metadata?: {
    display_name?: string
    name?: string
  }
  role?: string
}

interface Shop {
  id: string
  name: string
}

interface Period {
  id: string
  name: string
  description: string | null
  status: string
}

export default function PeriodDetailPage() {
  const params = useParams()
  const router = useRouter()
  const periodId = params.id as string

  const [period, setPeriod] = useState<Period | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [participants, setParticipants] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<string, string[]>>({}) // user_id -> shop_ids[]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [periodId])

  const fetchData = async () => {
    try {
      const [periodRes, usersRes, shopsRes, participantsRes, assignmentsRes] = await Promise.all([
        fetch(`/api/periods/${periodId}`),
        fetch('/api/users'),
        fetch('/api/shops'),
        fetch(`/api/periods/${periodId}/participants`),
        fetch(`/api/periods/${periodId}/assign-shops`),
      ])

      if (periodRes.ok) {
        const periodData = await periodRes.json()
        setPeriod(periodData)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      if (shopsRes.ok) {
        const shopsData = await shopsRes.json()
        setShops(shopsData.shops || [])
      }

      if (participantsRes.ok) {
        const participantsData = await participantsRes.json()
        const participantIds = (participantsData.participants || []).map((p: any) => p.user_id)
        setParticipants(participantIds)
      }

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json()
        setAssignments(assignmentsData.assignments || {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleParticipantToggle = (userId: string) => {
    setParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleShopToggle = (userId: string, shopId: string) => {
    setAssignments((prev) => {
      const userShops = prev[userId] || []
      const newShops = userShops.includes(shopId)
        ? userShops.filter((id) => id !== shopId)
        : [...userShops, shopId]
      return { ...prev, [userId]: newShops }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      // Save participants
      const participantsRes = await fetch(`/api/periods/${periodId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: participants }),
      })

      if (!participantsRes.ok) throw new Error('Failed to save participants')

      // Save shop assignments
      const assignmentsArray = Object.entries(assignments).map(([user_id, shop_ids]) => ({
        user_id,
        shop_ids,
      }))

      const assignmentsRes = await fetch(`/api/periods/${periodId}/assign-shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: assignmentsArray }),
      })

      if (!assignmentsRes.ok) throw new Error('Failed to save shop assignments')

      alert('Period updated successfully!')
      router.push('/dashboard/periods')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const getDisplayName = (user: User) => {
    return user.user_metadata?.display_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           user.email || 
           'User'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!period) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Period not found</p>
        <Link href="/dashboard/periods" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
          ← Back to Periods
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/periods" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Periods
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">{period.name}</h1>
        {period.description && (
          <p className="text-gray-600 mt-2">{period.description}</p>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Select Participants */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Select Participants
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Choose which users will participate in this stock count period.
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {users.map((user) => (
              <label
                key={user.id}
                className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={participants.includes(user.id)}
                  onChange={() => handleParticipantToggle(user.id)}
                  className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{getDisplayName(user)}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                {user.role && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user.role}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Assign Shops to Participants */}
        {participants.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Assign Shops to Participants
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              For each participant, select which shops they should count.
            </p>
            <div className="space-y-6">
              {participants.map((userId) => {
                const user = users.find((u) => u.id === userId)
                if (!user) return null

                const userShops = assignments[userId] || []

                return (
                  <div key={userId} className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      {getDisplayName(user)}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {shops.map((shop) => (
                        <label
                          key={shop.id}
                          className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={userShops.includes(shop.id)}
                            onChange={() => handleShopToggle(userId, shop.id)}
                            className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{shop.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || participants.length === 0}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving...' : 'Save Period Configuration'}
          </button>
        </div>
      </div>
    </div>
  )
}

