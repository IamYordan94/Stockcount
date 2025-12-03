'use client'

import { Minus, Plus } from 'lucide-react'

interface QuantityInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
}

export default function QuantityInput({ label, value, onChange, min = 0 }: QuantityInputProps) {
  const handleIncrement = () => {
    onChange(value + 1)
  }

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10) || 0
    if (newValue >= min) {
      onChange(newValue)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700 w-24">{label}</label>
      <div className="flex items-center border border-gray-300 rounded-md">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="p-2 md:p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center"
          aria-label="Decrease"
        >
          <Minus className="h-5 w-5 md:h-4 md:w-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          min={min}
          className="w-20 md:w-16 px-2 py-2 md:py-1 text-base md:text-sm text-center border-0 focus:ring-0 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleIncrement}
          className="p-2 md:p-1 hover:bg-gray-100 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 flex items-center justify-center"
          aria-label="Increase"
        >
          <Plus className="h-5 w-5 md:h-4 md:w-4" />
        </button>
      </div>
    </div>
  )
}

