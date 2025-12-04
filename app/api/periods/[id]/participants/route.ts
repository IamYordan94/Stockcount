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

    const { data: participants, error } = await supabase
      .from('period_participants')
      .select(`
        *,
        auth.users!inner(id, email, user_metadata)
      `)
      .eq('period_id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ participants })
  } catch (error) {
    console.error('Error fetching participants:', error)
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
    const { user_ids } = body

    if (!Array.isArray(user_ids)) {
      return NextResponse.json({ error: 'user_ids must be an array' }, { status: 400 })
    }

    // Remove existing participants
    await supabase
      .from('period_participants')
      .delete()
      .eq('period_id', params.id)

    // Add new participants
    if (user_ids.length > 0) {
      const participants = user_ids.map((userId: string) => ({
        period_id: params.id,
        user_id: userId,
        added_by: user.id,
      }))

      const { error: insertError } = await supabase
        .from('period_participants')
        .insert(participants)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating participants:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

