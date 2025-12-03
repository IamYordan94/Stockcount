'use client'

import { useState } from 'react'
import QuantityInput from './QuantityInput'

interface StockItem {
  id: string
  item_id: string
  item_name: string
  category: string
  packaging_unit_description: string | null
  packaging_units: number
  loose_pieces: number
  last_counted_at: string | null
  last_counted_by: string | null
}

interface StockTableProps {
  items: StockItem[]
  onUpdate: (itemId: string, packagingUnits: number, loosePieces: number) => Promise<void>
  loading?: boolean
}

export default function StockTable({ items, onUpdate, loading }: StockTableProps) {
  const [editing, setEditing] = useState<Record<string, { packaging_units: number; loose_pieces: number }>>({})
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  const handleEdit = (itemId: string, currentPackaging: number, currentLoose: number) => {
    setEditing({
      ...editing,
      [itemId]: {
        packaging_units: currentPackaging,
        loose_pieces: currentLoose,
      },
    })
  }

  const handleSave = async (itemId: string) => {
    const edited = editing[itemId]
    if (!edited) return

    setUpdating(prev => new Set(prev).add(itemId))
    try {
      await onUpdate(itemId, edited.packaging_units, edited.loose_pieces)
      setEditing(prev => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Failed to update stock:', error)
      alert('Failed to update stock. Please try again.')
    } finally {
      setUpdating(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleCancel = (itemId: string) => {
    setEditing(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, StockItem[]>)

  return (
    <div className="space-y-6">
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Packaging Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aantal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Losse Stuks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryItems.map((item) => {
                  const edited = editing[item.id]
                  const isEditing = !!edited
                  const isUpdating = updating.has(item.id)

                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {item.packaging_unit_description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={edited.packaging_units}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10) || 0
                              setEditing({
                                ...editing,
                                [item.id]: { ...edited, packaging_units: value },
                              })
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            min="0"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">{item.packaging_units}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            value={edited.loose_pieces}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10) || 0
                              setEditing({
                                ...editing,
                                [item.id]: { ...edited, loose_pieces: value },
                              })
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            min="0"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">{item.loose_pieces}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {isEditing ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSave(item.id)}
                              disabled={isUpdating}
                              className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                            >
                              {isUpdating ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => handleCancel(item.id)}
                              disabled={isUpdating}
                              className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(item.id, item.packaging_units, item.loose_pieces)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {categoryItems.map((item) => {
              const edited = editing[item.id]
              const isEditing = !!edited
              const isUpdating = updating.has(item.id)

              return (
                <div key={item.id} className="p-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-900">{item.item_name}</h4>
                    {item.packaging_unit_description && (
                      <p className="text-xs text-gray-500 mt-1">{item.packaging_unit_description}</p>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Aantal</label>
                      {isEditing ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={edited.packaging_units}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10) || 0
                            setEditing({
                              ...editing,
                              [item.id]: { ...edited, packaging_units: value },
                            })
                          }}
                          className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          min="0"
                        />
                      ) : (
                        <div className="text-base text-gray-900 font-medium">{item.packaging_units}</div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Losse Stuks</label>
                      {isEditing ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          value={edited.loose_pieces}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10) || 0
                            setEditing({
                              ...editing,
                              [item.id]: { ...edited, loose_pieces: value },
                            })
                          }}
                          className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          min="0"
                        />
                      ) : (
                        <div className="text-base text-gray-900 font-medium">{item.loose_pieces}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSave(item.id)}
                          disabled={isUpdating}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => handleCancel(item.id)}
                          disabled={isUpdating}
                          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(item.id, item.packaging_units, item.loose_pieces)}
                        className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 min-h-[44px]"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

