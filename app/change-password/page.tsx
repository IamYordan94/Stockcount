'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    // Check if user needs to change password
    const checkPasswordChange = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Check if must_change_password flag is set
      const { data } = await supabase
        .from('user_roles')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (!data?.must_change_password) {
        router.push('/dashboard')
      }
    }

    checkPasswordChange()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setWarning(null)

    // Client-side validation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please make sure both password fields are identical.')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      // Read response as text first (can only read once)
      const responseText = await response.text()
      
      // Try to parse as JSON
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        // If response is not JSON, use the text as error message
        throw new Error(`Server error: ${response.status} ${response.statusText}. ${responseText || 'Please try again.'}`)
      }

      if (!response.ok) {
        // Extract detailed error message from API
        const errorMessage = responseData.error || `Failed to change password (${response.status})`
        const errorCode = responseData.code || 'UNKNOWN'
        
        // Provide user-friendly error messages based on error type
        if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.')
        } else if (response.status === 400) {
          throw new Error(errorMessage)
        } else if (response.status === 500) {
          throw new Error(`Server error: ${errorMessage}. Please try again or contact support.`)
        } else {
          throw new Error(errorMessage)
        }
      }

      // Success response
      if (responseData.success) {
        // Check for warnings (non-critical issues)
        if (responseData.warning) {
          setWarning(responseData.warning)
          // Still redirect after a short delay to show the warning
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 2000)
        } else {
          // No warnings, redirect immediately
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        throw new Error(responseData.error || 'Failed to change password. Please try again.')
      }
    } catch (err) {
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Could not connect to server. Please check your internet connection and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      }
      console.error('Password change error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Change Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You must change your password before continuing.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {warning && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <p className="font-medium">Notice</p>
              <p className="text-sm">{warning}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !!warning}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Changing Password...
                </span>
              ) : warning ? (
                'Redirecting...'
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
