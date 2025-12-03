-- Migration 003: Auto-create user_roles entry for new users
-- This ensures every user automatically gets a role entry when they register

-- Function to create default user_roles entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (id, role, shop_id, must_change_password, created_at)
  VALUES (
    NEW.id,
    'staff', -- Default role for new users
    NULL, -- No shop assigned by default
    true, -- Must change password on first login
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user_roles when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users who don't have a user_roles entry
-- This handles users who registered before this migration
INSERT INTO public.user_roles (id, role, shop_id, must_change_password, created_at)
SELECT 
  au.id,
  'staff' as role,
  NULL as shop_id,
  true as must_change_password,
  COALESCE(au.created_at, NOW()) as created_at
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.id = au.id
WHERE ur.id IS NULL
ON CONFLICT (id) DO NOTHING;

