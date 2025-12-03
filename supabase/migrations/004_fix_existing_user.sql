-- Migration 004: Fix existing users who don't have must_change_password set
-- Run this if you registered before migration 003 was run

-- Set must_change_password = true for all users who don't have it set
-- This ensures they'll be prompted to change password on next login
UPDATE user_roles
SET must_change_password = true
WHERE must_change_password IS NULL OR must_change_password = false;

-- If you want to manually set a specific user to admin and skip password change:
-- Replace 'YOUR_USER_UUID_HERE' with your actual user UUID from auth.users
-- UPDATE user_roles
-- SET role = 'admin', must_change_password = false
-- WHERE id = 'YOUR_USER_UUID_HERE';

