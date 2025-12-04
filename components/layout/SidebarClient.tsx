'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  FileText, 
  History,
  Users,
  Menu,
  X,
  User,
  Archive,
  AlertTriangle,
  Calendar
} from 'lucide-react'

interface SidebarClientProps {
  isAdmin: boolean
}

export default function SidebarClient({ isAdmin }: SidebarClientProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [
      { name: 'Stock Count Periods', href: '/dashboard/periods', icon: Calendar },
    ] : []),
    { name: 'Shops', href: '/dashboard/shops', icon: Store },
    { name: 'Items', href: '/dashboard/items', icon: Package },
    { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    { name: 'History', href: '/dashboard/history', icon: History },
    ...(isAdmin ? [
      { name: 'Inventory', href: '/dashboard/inventory', icon: Archive },
      { name: 'Wastage', href: '/dashboard/wastage', icon: AlertTriangle },
      { name: 'Users', href: '/dashboard/users', icon: Users }
    ] : []),
    { name: 'Profile', href: '/dashboard/profile', icon: User },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="p-4 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-4 md:mb-0">
            <h2 className="text-lg font-bold md:hidden">Menu</h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-2 hover:bg-gray-800 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-md min-h-[44px]',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </>
  )
}
