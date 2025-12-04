'use client'

import { useState, useEffect } from 'react'
import StockTable from './StockTable'
import { createClient } from '@/lib/supabase/client'

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

interface StockTableClientProps {
  items: StockItem[]
  shopId: string
}

export default function StockTableClient({ items: initialItems, shopId }: StockTableClientProps) {
  const [items, setItems] = useState(initialItems)
  const [syncing, setSyncing] = useState(false)

  // Set up real-time subscription
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_stock',
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          // Refresh data when changes occur
          fetchUpdatedItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId])

  const fetchUpdatedItems = async () => {
    try {
      const response = await fetch(`/api/shops/${shopId}/stock`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
      }
    } catch (error) {
      console.error('Failed to refresh stock:', error)
    }
  }

  const handleUpdate = async (
    stockId: string,
    packagingUnits: number,
    loosePieces: number
  ) => {
    setSyncing(true)
    try {
      const response = await fetch('/api/stock', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockId,
          packagingUnits,
          loosePieces,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update stock')
      }

      const result = await response.json()
      
      // Wait a moment for real-time sync, then refresh
      setTimeout(() => {
        fetchUpdatedItems()
      }, 500)

      return result
    } catch (error) {
      throw error
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      {syncing && (
        <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded">
          Syncing changes...
        </div>
      )}
      <StockTable items={items} onUpdate={handleUpdate} />
    </div>
  )
}

