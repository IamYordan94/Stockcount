'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFirstUser, setIsFirstUser] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkIfFirstUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkIfFirstUser = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if there are any admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)

      // If no admins exist, this is the first user
      setIsFirstUser(!admins || admins.length === 0)
    } catch (err) {
      console.error('Error checking first user:', err)
      setIsFirstUser(false)
    } finally {
      setChecking(false)
    }
  }

  const handleBecomeAdmin = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in')
        return
      }

      // Update role to admin
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ 
          role: 'admin',
          must_change_password: false 
        })
        .eq('id', user.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Failed to set admin role. Please try again.')
      console.error('Error setting admin:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleContinueAsStaff = () => {
    router.push('/dashboard')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isFirstUser) {
    // Not the first user, redirect to dashboard
    router.push('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome! Choose Your Role
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You&apos;re the first user. Would you like to become an administrator?
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Administrator</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Can import shops and items</li>
              <li>Can create and manage users</li>
              <li>Can assign shops to users</li>
              <li>Full access to all features</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Staff</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Can count stock in assigned shops</li>
              <li>Can view reports</li>
              <li>Limited access (requires admin assignment)</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleBecomeAdmin}
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Setting up...' : 'Become Administrator'}
          </button>
          <button
            onClick={handleContinueAsStaff}
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
          >
            Continue as Staff
          </button>
        </div>
      </div>
    </div>
  )
}

