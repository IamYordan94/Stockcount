import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageUsers } from '@/lib/utils/roles'

export async function GET(request: NextRequest) {
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

    // Get all periods with participant and shop counts
    const { data: periods, error } = await supabase
      .from('stock_count_periods')
      .select(`
        *,
        period_participants(count),
        shop_assignments!inner(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get counts for each period
    const periodsWithCounts = await Promise.all(
      (periods || []).map(async (period: any) => {
        const [participantsRes, shopsRes] = await Promise.all([
          supabase
            .from('period_participants')
            .select('id', { count: 'exact', head: true })
            .eq('period_id', period.id),
          supabase
            .from('shop_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('period_id', period.id)
            .eq('active', true),
        ])

        return {
          ...period,
          participant_count: participantsRes.count || 0,
          shop_count: shopsRes.count || 0,
        }
      })
    )

    return NextResponse.json({ periods: periodsWithCounts })
  } catch (error) {
    console.error('Error fetching periods:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { name, description, start_date, end_date } = body

    if (!name) {
      return NextResponse.json({ error: 'Period name is required' }, { status: 400 })
    }

    const { data: period, error } = await supabase
      .from('stock_count_periods')
      .insert({
        name,
        description: description || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ period })
  } catch (error) {
    console.error('Error creating period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

