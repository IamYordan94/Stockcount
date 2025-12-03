import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/utils/roles'
import Navbar from '@/components/layout/Navbar'
import SidebarClient from '@/components/layout/SidebarClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = await getUserRole(user.id)
  const isAdmin = role === 'admin'

  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarClient isAdmin={isAdmin} />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

