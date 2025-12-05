import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ensure this route uses Node.js runtime (not Edge) for better compatibility
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('[Change Password] Starting password change process')
    
    const supabase = await createClient()
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    if (getUserError) {
      console.error('[Change Password] Error getting user:', getUserError)
      return NextResponse.json({ error: 'Authentication error: ' + getUserError.message }, { status: 401 })
    }

    if (!user) {
      console.error('[Change Password] No user found')
      return NextResponse.json({ error: 'Unauthorized: Please log in again' }, { status: 401 })
    }

    console.log('[Change Password] User authenticated:', user.id)

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Change Password] Error parsing request body:', parseError)
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }

    const { newPassword } = body

    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    console.log('[Change Password] Updating password for user:', user.id)

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error('[Change Password] Password update failed:', updateError)
      return NextResponse.json({ 
        error: `Failed to update password: ${updateError.message}`,
        code: updateError.status || 'UNKNOWN'
      }, { status: 400 })
    }

    console.log('[Change Password] Password updated successfully, clearing must_change_password flag')

    // Clear must_change_password flag
    // Try with regular client first, fallback to admin client if RLS blocks it
    const { error: updateRoleError, data: updateRoleData } = await supabase
      .from('user_roles')
      .update({ must_change_password: false })
      .eq('id', user.id)
      .select()

    // If RLS blocks the update, use admin client
    if (updateRoleError) {
      console.warn('[Change Password] RLS blocked user_roles update, trying admin client:', {
        error: updateRoleError.message,
        code: updateRoleError.code,
        details: updateRoleError.details
      })

      // Check if admin client can be created
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Change Password] SUPABASE_SERVICE_ROLE_KEY not set, cannot use admin client')
        // Password was updated, but flag wasn't cleared - this is not critical
        // User can still proceed, but might be redirected to change password again
        return NextResponse.json({ 
          success: true,
          warning: 'Password updated, but could not clear password change flag. You may need to contact an administrator.'
        })
      }

      try {
        const adminClient = createAdminClient()
        const { error: adminUpdateError, data: adminUpdateData } = await adminClient
          .from('user_roles')
          .update({ must_change_password: false })
          .eq('id', user.id)
          .select()

        if (adminUpdateError) {
          console.error('[Change Password] Admin client update failed:', {
            error: adminUpdateError.message,
            code: adminUpdateError.code,
            details: adminUpdateError.details,
            hint: adminUpdateError.hint
          })
          // Password was updated successfully, flag update failed
          // This is not critical - user can proceed
          return NextResponse.json({ 
            success: true,
            warning: 'Password updated successfully, but could not update user settings. Please contact support if you continue to see this message.'
          })
        }

        console.log('[Change Password] Admin client successfully updated flag')
      } catch (adminClientError) {
        console.error('[Change Password] Error creating admin client:', adminClientError)
        // Password was updated, continue anyway
        return NextResponse.json({ 
          success: true,
          warning: 'Password updated, but there was an issue updating your account settings.'
        })
      }
    } else {
      console.log('[Change Password] Successfully updated must_change_password flag')
    }

    console.log('[Change Password] Password change completed successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Change Password] Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: `Internal server error: ${errorMessage}`,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}
