'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  const getDisplayName = () => {
    if (!user) return ''
    return user.user_metadata?.display_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           user.email || 
           'User'
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Stock Count App</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-700">{getDisplayName()}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-700 hover:text-gray-900 min-h-[44px] px-3"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

