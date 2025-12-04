import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageUsers } from '@/lib/utils/roles'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canManage = await canManageUsers(user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all shop assignments for this period
    const { data: assignments, error } = await supabase
      .from('shop_assignments')
      .select('user_id, shop_id')
      .eq('period_id', params.id)
      .eq('active', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by user_id
    const grouped: Record<string, string[]> = {}
    assignments?.forEach((assignment) => {
      if (!grouped[assignment.user_id]) {
        grouped[assignment.user_id] = []
      }
      grouped[assignment.user_id].push(assignment.shop_id)
    })

    return NextResponse.json({ assignments: grouped })
  } catch (error) {
    console.error('Error fetching assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canManage = await canManageUsers(user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { assignments } = body // Array of { user_id, shop_ids: [] }

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'assignments must be an array' }, { status: 400 })
    }

    // Deactivate all current assignments for this period
    const { error: deactivateError } = await supabase
      .from('shop_assignments')
      .update({ active: false })
      .eq('period_id', params.id)

    if (deactivateError) {
      console.error('Error deactivating assignments:', deactivateError)
      return NextResponse.json({ 
        error: `Failed to deactivate existing assignments: ${deactivateError.message}` 
      }, { status: 500 })
    }

    // Create new assignments
    const newAssignments: any[] = []
    
    for (const assignment of assignments) {
      const { user_id, shop_ids } = assignment
      
      if (!user_id || !Array.isArray(shop_ids)) {
        console.warn('Invalid assignment:', assignment)
        continue
      }

      for (const shop_id of shop_ids) {
        if (!shop_id) {
          console.warn('Invalid shop_id in assignment:', assignment)
          continue
        }
        newAssignments.push({
          user_id,
          shop_id,
          period_id: params.id,
          assigned_by: user.id,
          active: true,
        })
      }
    }

    if (newAssignments.length > 0) {
      const { error: insertError } = await supabase
        .from('shop_assignments')
        .insert(newAssignments)

      if (insertError) {
        console.error('Error inserting assignments:', insertError)
        return NextResponse.json({ 
          error: `Failed to create assignments: ${insertError.message}`,
          details: insertError.details,
          hint: insertError.hint
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, count: newAssignments.length })
  } catch (error) {
    console.error('Error assigning shops:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
