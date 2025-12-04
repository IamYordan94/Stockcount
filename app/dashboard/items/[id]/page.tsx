'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditItemPage() {
  const router = useRouter()
  const params = useParams()
  const itemId = params.id as string

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [packagingUnitDescription, setPackagingUnitDescription] = useState('')
  const [mainCategory, setMainCategory] = useState<'floor' | 'catering'>('floor')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchItem()
  }, [itemId])

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/items/${itemId}`)
      if (!response.ok) throw new Error('Failed to fetch item')
      
      const data = await response.json()
      setName(data.name || '')
      setCategory(data.category || '')
      setPackagingUnitDescription(data.packaging_unit_description || '')
      setMainCategory(data.main_category || 'floor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: category || 'Uncategorized',
          packaging_unit_description: packagingUnitDescription,
          main_category: mainCategory,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item')
      }

      router.push('/dashboard/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/items" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Items
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Edit Product</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              type="text"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., IJSJES, DRANK, ETEN"
            />
          </div>

          <div>
            <label htmlFor="packagingUnitDescription" className="block text-sm font-medium text-gray-700">
              Packaging Unit Description
            </label>
            <input
              type="text"
              id="packagingUnitDescription"
              value={packagingUnitDescription}
              onChange={(e) => setPackagingUnitDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="mainCategory" className="block text-sm font-medium text-gray-700">
              Main Category *
            </label>
            <select
              id="mainCategory"
              required
              value={mainCategory}
              onChange={(e) => setMainCategory(e.target.value as 'floor' | 'catering')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="floor">Floor</option>
              <option value="catering">Catering</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/items"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 min-h-[44px] flex items-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

