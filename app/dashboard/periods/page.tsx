'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Calendar, Users, Store, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

interface Period {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'completed' | 'archived'
  created_at: string
  participant_count?: number
  shop_count?: number
}

export default function PeriodsPage() {
  const router = useRouter()
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPeriods()
  }, [])

  const fetchPeriods = async () => {
    try {
      const response = await fetch('/api/periods')
      if (!response.ok) throw new Error('Failed to fetch periods')
      const data = await response.json()
      setPeriods(data.periods || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load periods')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (periodId: string, newStatus: 'active' | 'completed' | 'archived') => {
    try {
      const response = await fetch(`/api/periods/${periodId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')
      fetchPeriods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Stock Count Periods</h1>
        <Link
          href="/dashboard/periods/new"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors min-h-[44px]"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Period
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {periods.length > 0 ? (
        <div className="space-y-4">
          {periods.map((period) => (
            <div
              key={period.id}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{period.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        period.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : period.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {period.status.toUpperCase()}
                    </span>
                  </div>

                  {period.description && (
                    <p className="text-sm text-gray-600 mb-3">{period.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {period.start_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Start: {format(new Date(period.start_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {period.end_date && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        End: {format(new Date(period.end_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {period.participant_count !== undefined && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {period.participant_count} participant{period.participant_count !== 1 ? 's' : ''}
                      </div>
                    )}
                    {period.shop_count !== undefined && (
                      <div className="flex items-center">
                        <Store className="h-4 w-4 mr-1" />
                        {period.shop_count} shop{period.shop_count !== 1 ? 's' : ''} assigned
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Link
                    href={`/dashboard/periods/${period.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors min-h-[44px] flex items-center"
                  >
                    Manage
                  </Link>
                  {period.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(period.id, 'completed')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors min-h-[44px] flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No periods</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a new stock count period to get started.
          </p>
        </div>
      )}
    </div>
  )
}

