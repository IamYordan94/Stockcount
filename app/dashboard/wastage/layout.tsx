import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { canManageUsers } from '@/lib/utils/roles'

export default async function WastageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const canManage = await canManageUsers(user.id)
  if (!canManage) {
    redirect('/dashboard')
  }

  return <>{children}</>
}

