'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewItemPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [packagingUnitDescription, setPackagingUnitDescription] = useState('')
  const [mainCategory, setMainCategory] = useState<'floor' | 'catering'>('floor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create item')
      }

      router.push('/dashboard/items')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/items" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Items
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">Add New Product</h1>
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
              placeholder="Enter product name"
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
            <p className="mt-1 text-sm text-gray-500">
              Shop-level category (e.g., IJSJES, DRANK, ETEN, Cheese, Stromma goods)
            </p>
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
              placeholder="e.g., per 24 blikjes, per doos 6 stuks"
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
            <p className="mt-1 text-sm text-gray-500">
              Main category for inventory organization
            </p>
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
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

