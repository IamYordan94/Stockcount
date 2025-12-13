'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../auth-provider'
import Link from 'next/link'
import { LogOut, Package, Users, Settings, FileSpreadsheet, Store, Sparkles, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import HelpButton from '@/components/ui/HelpButton'
import UserManual from '@/components/ui/UserManual'

interface Shop {
  id: string
  name: string
}

export default function DashboardPage() {
  const { user, loading, role, userName } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [checkingRole, setCheckingRole] = useState(false)
  const [assignedShops, setAssignedShops] = useState<Shop[]>([])
  const [loadingShops, setLoadingShops] = useState(false)
  const [showManual, setShowManual] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && role === 'employee' && !loading) {
      fetchAssignedShops()
    }
  }, [user, role, loading])

  async function fetchAssignedShops() {
    if (!user) return
    
    try {
      setLoadingShops(true)
      const { data: assignments, error } = await supabase
        .from('user_shop_assignments')
        .select('*, shops(*)')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching assigned shops:', error)
        setAssignedShops([])
      } else {
        const shops = assignments?.map((a) => ({
          id: a.shop_id,
          name: (a.shops as any)?.name || 'Unknown Shop',
        })) || []
        setAssignedShops(shops)
      }
    } catch (err) {
      console.error('Error:', err)
      setAssignedShops([])
    } finally {
      setLoadingShops(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleRefreshRole = async () => {
    if (!user) return
    
    setCheckingRole(true)
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (roleError) {
        console.error('Role check error:', roleError)
        alert('Error checking role: ' + roleError.message + '\n\nCheck browser console (F12) for details.')
      } else if (roleData) {
        alert(`Role found: ${roleData.role}. Refreshing page...`)
        setTimeout(() => window.location.reload(), 500)
      } else {
        alert('No role found in database. Please run the SQL command shown above in Supabase SQL Editor.')
      }
    } catch (err: any) {
      console.error('Error refreshing role:', err)
      alert('Error: ' + err.message + '\n\nCheck browser console (F12) for details.')
    } finally {
      setCheckingRole(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) return null

  const isManager = role === 'manager'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-medium border-b border-white/20 sticky top-0 z-50">
        <div className="container-mobile py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Welcome back, <span className="font-medium text-gray-900">{userName || user.email?.split('@')[0] || 'User'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton onClick={() => setShowManual(true)} />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-mobile py-8">
        {/* Warning message if no role */}
        {!role && (
          <div className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-5 shadow-soft animate-fade-in">
            <p className="text-sm text-yellow-800 mb-3 font-medium">
              <strong>No role assigned.</strong> Please set your role in the database.
            </p>
            <p className="text-xs text-yellow-700 mb-3 font-mono bg-yellow-100/50 p-3 rounded-xl border border-yellow-200">
              INSERT INTO user_roles (user_id, role) VALUES ('{user.id}', 'manager') ON CONFLICT (user_id) DO UPDATE SET role = 'manager';
            </p>
            <button
              onClick={handleRefreshRole}
              disabled={checkingRole}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl hover:from-yellow-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 shadow-md transition-all"
            >
              {checkingRole ? 'Checking...' : 'Check & Refresh Role'}
            </button>
          </div>
        )}

        {isManager ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
            <Link
              href="/dashboard/sessions"
              className="group relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100/50 to-transparent rounded-full blur-2xl"></div>
              <div className="relative flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <FileSpreadsheet className="text-white" size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Stock Count Sessions
                </h2>
              </div>
              <p className="text-sm text-gray-600 relative z-10">
                Start new sessions and download results
              </p>
            </Link>

            <Link
              href="/dashboard/products"
              className="group relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100/50 to-transparent rounded-full blur-2xl"></div>
              <div className="relative flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Package className="text-white" size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Products
                </h2>
              </div>
              <p className="text-sm text-gray-600 relative z-10">
                Manage items and categories
              </p>
            </Link>

            <Link
              href="/dashboard/users"
              className="group relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-full blur-2xl"></div>
              <div className="relative flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Users className="text-white" size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Users
                </h2>
              </div>
              <p className="text-sm text-gray-600 relative z-10">
                Manage users and shop assignments
              </p>
            </Link>

            <Link
              href="/dashboard/shops"
              className="group relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100/50 to-transparent rounded-full blur-2xl"></div>
              <div className="relative flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Settings className="text-white" size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Shops
                </h2>
              </div>
              <p className="text-sm text-gray-600 relative z-10">
                Manage shop locations
              </p>
            </Link>

            <Link
              href="/dashboard/analytics"
              className="group relative bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-medium border border-white/20 hover:shadow-glow hover:border-primary-300 transition-all duration-300 card-hover overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/50 to-transparent rounded-full blur-2xl"></div>
              <div className="relative flex items-center gap-4 mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Analytics
                </h2>
              </div>
              <p className="text-sm text-gray-600 relative z-10">
                View statistics and insights
              </p>
            </Link>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Assigned Shops Section */}
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-medium border border-white/20">
              <div className="flex items-center gap-4 mb-5">
                <div className="p-3 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-xl shadow-md">
                  <Store className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Your Assigned Shops</h2>
                  <p className="text-xs text-gray-500">Shops you can count stock for</p>
                </div>
              </div>
              {loadingShops ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : assignedShops.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignedShops.map((shop, index) => (
                    <div
                      key={shop.id}
                      className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft"></div>
                        <p className="font-semibold text-gray-900">{shop.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
                    <Store className="text-gray-400" size={24} />
                  </div>
                  <p className="text-sm text-gray-600">
                    No shops assigned yet. Please contact a manager to assign shops to your account.
                  </p>
                </div>
              )}
            </div>

            {/* Count Stock Card */}
            <Link
              href="/dashboard/count"
              className="group relative bg-gradient-to-br from-primary-500 to-indigo-600 p-8 rounded-2xl shadow-glow border border-primary-400/20 hover:shadow-glow-lg transition-all duration-300 card-hover overflow-hidden block"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Package className="text-white" size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      Count Stock
                    </h2>
                    <p className="text-sm text-white/90">
                      Enter stock counts for your assigned shops
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <Sparkles size={16} />
                  <span>Start counting now</span>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      <UserManual isOpen={showManual} onClose={() => setShowManual(false)} />
    </div>
  )
}
