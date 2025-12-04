import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

    // Use admin client to list users
    const adminClient = createAdminClient()
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers()
    
    if (usersError) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get roles for all users
    const userIds = users.users.map(u => u.id)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .in('id', userIds)

    // Get shop assignments for all users
    const { data: assignments } = await supabase
      .from('shop_assignments')
      .select('user_id, shop_id, shops(name)')
      .eq('active', true)
      .in('user_id', userIds)

    // Combine data
    const usersWithRoles = users.users.map(u => {
      const role = roles?.find(r => r.id === u.id)
      const userAssignments = assignments?.filter(a => a.user_id === u.id) || []
      return {
        id: u.id,
        email: u.email,
        role: role?.role || null,
        shop_id: role?.shop_id || null,
        must_change_password: role?.must_change_password || false,
        assigned_shops: userAssignments.map(a => ({
          shop_id: a.shop_id,
          shop_name: (a.shops as any)?.name
        }))
      }
    })

    return NextResponse.json({ users: usersWithRoles })
  } catch (error) {
    console.error('Error fetching users:', error)
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
    const { email, password, role, shop_id, display_name } = body

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Use admin client to create user
    const adminClient = createAdminClient()
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name: display_name || email.split('@')[0], // Fallback to email username if not provided
        name: display_name || email.split('@')[0],
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Create user role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        id: newUser.user.id,
        role,
        shop_id: shop_id || null,
        must_change_password: true,
        created_by: user.id,
      })

    if (roleError) {
      // Rollback: delete the auth user if role creation fails
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Failed to create user role' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
