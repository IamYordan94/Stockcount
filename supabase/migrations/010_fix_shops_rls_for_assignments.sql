-- Migration 010: Fix shops RLS policy to use shop_assignments instead of user_roles.shop_id
-- This allows staff users to view shops they're assigned to via shop_assignments table

-- Drop the old policy that checks user_roles.shop_id
DROP POLICY IF EXISTS "Managers and staff can view their shop" ON shops;

-- Create new policy that checks shop_assignments table
CREATE POLICY "Staff can view assigned shops" ON shops
  FOR SELECT USING (
    -- Admins can see all shops (handled by separate policy)
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
    OR
    -- Staff can see shops they're assigned to via shop_assignments
    EXISTS (
      SELECT 1 FROM shop_assignments
      WHERE shop_assignments.user_id = auth.uid()
        AND shop_assignments.shop_id = shops.id
        AND shop_assignments.active = true
    )
    OR
    -- Backward compatibility: check user_roles.shop_id (for old assignments)
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() 
        AND user_roles.shop_id = shops.id
        AND user_roles.role IN ('staff', 'manager')
    )
  );

