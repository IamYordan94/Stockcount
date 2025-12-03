-- Migration 002: User Management System
-- Run this ONCE in Supabase SQL Editor, then never again!
-- All user management after this is done through the admin UI

-- Add columns to user_roles table
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create shop_assignments table
CREATE TABLE IF NOT EXISTS shop_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Create unique index for active assignments (prevents duplicate active assignments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_assignments_unique_active 
ON shop_assignments(user_id, shop_id) 
WHERE active = true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shop_assignments_user_id ON shop_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_assignments_shop_id ON shop_assignments(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_assignments_active ON shop_assignments(active) WHERE active = true;

-- Enable Row Level Security
ALTER TABLE shop_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_assignments
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Admins can view all shop assignments" ON shop_assignments;
CREATE POLICY "Admins can view all shop assignments" ON shop_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their own assignments" ON shop_assignments;
CREATE POLICY "Users can view their own assignments" ON shop_assignments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can create shop assignments" ON shop_assignments;
CREATE POLICY "Admins can create shop assignments" ON shop_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update shop assignments" ON shop_assignments;
CREATE POLICY "Admins can update shop assignments" ON shop_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete shop assignments" ON shop_assignments;
CREATE POLICY "Admins can delete shop assignments" ON shop_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Update RLS policies for user_roles to allow admins to manage
-- (These should already exist, but ensuring they're correct)
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Allow admins to delete user roles
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Enable real-time for shop_stock table (prevents data loss)
-- This might fail if already added, but that's okay
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE shop_stock;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
