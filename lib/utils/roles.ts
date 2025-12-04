import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/types/database'

type Role = 'admin' | 'staff'

export async function getUserRole(userId: string): Promise<Role | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data.role
}

export async function getUserShopId(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select('shop_id')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data.shop_id
}

export async function canAccessShop(userId: string, shopId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  if (role === 'admin') return true

  const supabase = await createClient()
  
  // Check shop assignments in active periods
  const { data: assignment } = await supabase
    .from('shop_assignments')
    .select(`
      id,
      period_id,
      stock_count_periods!inner(status)
    `)
    .eq('user_id', userId)
    .eq('shop_id', shopId)
    .eq('active', true)
    .eq('stock_count_periods.status', 'active')
    .single()

  if (assignment) {
    // If assignment has a period, check if user is a participant
    if (assignment.period_id) {
      const { data: participant } = await supabase
        .from('period_participants')
        .select('id')
        .eq('user_id', userId)
        .eq('period_id', assignment.period_id)
        .single()
      
      if (participant) return true
    } else {
      // No period assigned, allow access (backward compatibility)
      return true
    }
  }

  // Fallback: check assignments without period
  const { data: oldAssignment } = await supabase
    .from('shop_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('shop_id', shopId)
    .eq('active', true)
    .is('period_id', null)
    .single()

  if (oldAssignment) return true

  // Fallback to old shop_id in user_roles (for backward compatibility)
  const userShopId = await getUserShopId(userId)
  return userShopId === shopId
}

export async function getUserAssignedShops(userId: string): Promise<string[]> {
  const role = await getUserRole(userId)
  if (role === 'admin') {
    // Admins see all shops
    const supabase = await createClient()
    const { data: shops } = await supabase
      .from('shops')
      .select('id')
    return shops?.map(s => s.id) || []
  }

  const supabase = await createClient()
  
  // Get shops assigned in active periods
  const { data: assignments } = await supabase
    .from('shop_assignments')
    .select(`
      shop_id,
      period_id,
      stock_count_periods!inner(status)
    `)
    .eq('user_id', userId)
    .eq('active', true)
    .eq('stock_count_periods.status', 'active')

  // Also check if user is a participant in the period
  if (assignments && assignments.length > 0) {
    // Filter to only include shops where user is a participant
    const periodIds = [...new Set(assignments.map(a => a.period_id).filter(Boolean))]
    
    if (periodIds.length > 0) {
      const { data: participants } = await supabase
        .from('period_participants')
        .select('period_id')
        .eq('user_id', userId)
        .in('period_id', periodIds)
      
      const participantPeriodIds = new Set(participants?.map(p => p.period_id) || [])
      
      return assignments
        .filter(a => !a.period_id || participantPeriodIds.has(a.period_id))
        .map(a => a.shop_id)
    }
  }

  // Fallback: check assignments without period (backward compatibility)
  const { data: oldAssignments } = await supabase
    .from('shop_assignments')
    .select('shop_id')
    .eq('user_id', userId)
    .eq('active', true)
    .is('period_id', null)

  return oldAssignments?.map(a => a.shop_id) || []
}

export async function mustChangePassword(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select('must_change_password')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return data.must_change_password === true
}

export async function canManageUsers(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'admin'
}

