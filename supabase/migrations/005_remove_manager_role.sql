-- Migration 005: Remove 'manager' role, keep only 'admin' and 'staff'
-- This simplifies the role system to just two roles

-- Update the role check constraint to remove 'manager'
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'staff'));

-- Optional: Convert any existing 'manager' roles to 'staff'
-- Uncomment the line below if you want to automatically convert managers to staff
-- UPDATE user_roles SET role = 'staff' WHERE role = 'manager';

