-- ============================================
-- SQL Statements for Direct User Creation
-- ============================================

-- ============================================
-- METHOD 1: Insert into public.users after Auth user is created
-- ============================================
-- Use this AFTER creating the user in Supabase Dashboard → Authentication → Users
-- OR after using the Auth API to create the user

-- Step 1: Create user in Auth Dashboard first, then copy the User ID (UUID)
-- Step 2: Run this SQL with the actual User ID

INSERT INTO public.users (id, email, full_name, role, active, created_by)
VALUES (
  'USER_ID_FROM_AUTH',           -- Replace with UUID from auth.users
  'user@example.com',            -- User's email
  'Full Name',                    -- User's full name (optional)
  'installer',                   -- Role: 'installer', 'admin', 'manager', or 'developer'
  true,                          -- Active status
  'ADMIN_USER_ID'                -- UUID of admin creating this user (optional, can be NULL)
);

-- Example: Create an admin user
INSERT INTO public.users (id, email, full_name, role, active, must_change_password)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- From auth.users
  'admin@company.com',
  'Admin User',
  'admin',
  true,
  true  -- Will be forced to change password on first login
);

-- Example: Create an installer user
INSERT INTO public.users (id, email, full_name, role, active)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',  -- From auth.users
  'installer@company.com',
  'John Installer',
  'installer',
  true
);

-- ============================================
-- METHOD 2: Using Supabase Admin Functions (Advanced)
-- ============================================
-- This requires service_role key and admin privileges
-- Note: This method may not work in all Supabase setups

-- Create user in auth.users using admin function
-- Then insert into public.users

DO $$
DECLARE
  new_user_id UUID;
  user_email TEXT := 'newuser@example.com';
  user_password TEXT := 'SecurePassword123!';
  user_full_name TEXT := 'New User';
  user_role TEXT := 'installer';
BEGIN
  -- Create user in auth.users (requires admin privileges)
  -- Note: This may require using Supabase Management API instead
  -- For now, use METHOD 1 which is more reliable
  
  -- After user is created in auth, insert into public.users
  -- (This part would go here, but user must exist in auth.users first)
END $$;

-- ============================================
-- METHOD 3: Batch User Creation
-- ============================================
-- Create multiple users at once (after they exist in auth.users)

INSERT INTO public.users (id, email, full_name, role, active) VALUES
  ('uuid-1-here', 'user1@example.com', 'User One', 'installer', true),
  ('uuid-2-here', 'user2@example.com', 'User Two', 'installer', true),
  ('uuid-3-here', 'manager@example.com', 'Manager User', 'manager', true),
  ('uuid-4-here', 'admin2@example.com', 'Second Admin', 'admin', true);

-- ============================================
-- METHOD 4: Update Existing User Role
-- ============================================
-- If user already exists in public.users, update their role

UPDATE public.users
SET 
  role = 'admin',
  full_name = 'Updated Name',
  updated_at = NOW()
WHERE email = 'user@example.com';

-- ============================================
-- METHOD 5: Create User with Function (Recommended for Production)
-- ============================================
-- Create a function that handles user creation safely

CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'installer',
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, full_name, role, created_by)
  VALUES (p_user_id, p_email, p_full_name, p_role, p_created_by)
  RETURNING id INTO v_user_id;
  
  RETURN v_user_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'User ID % does not exist in auth.users', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage of the function:
-- SELECT public.create_user_with_role(
--   'user-id-from-auth'::UUID,
--   'user@example.com',
--   'User Name',
--   'admin'::user_role,
--   'admin-user-id'::UUID  -- Optional: who created this user
-- );

-- ============================================
-- QUICK REFERENCE: Common User Creation Queries
-- ============================================

-- 1. Create Admin User (will be forced to change password on first login)
INSERT INTO public.users (id, email, full_name, role, must_change_password)
VALUES (
  'REPLACE_WITH_AUTH_USER_ID',
  'admin@company.com',
  'Admin User',
  'admin',
  true  -- Must change password on first login
);

-- 2. Create Manager User
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'REPLACE_WITH_AUTH_USER_ID',
  'manager@company.com',
  'Manager User',
  'manager'
);

-- 3. Create Installer User
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'REPLACE_WITH_AUTH_USER_ID',
  'installer@company.com',
  'Installer Name',
  'installer'
);

-- 4. Create Developer User (superuser)
INSERT INTO public.users (id, email, full_name, role)
VALUES (
  'REPLACE_WITH_AUTH_USER_ID',
  'developer@company.com',
  'Developer Name',
  'developer'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if user exists
SELECT id, email, full_name, role, active, created_at
FROM public.users
WHERE email = 'user@example.com';

-- List all users by role
SELECT id, email, full_name, role, active
FROM public.users
WHERE role = 'admin'
ORDER BY created_at DESC;

-- List all active users
SELECT id, email, full_name, role
FROM public.users
WHERE active = true
ORDER BY role, email;

-- Check user exists in both auth.users and public.users
SELECT 
  au.id,
  au.email as auth_email,
  pu.email as public_email,
  pu.role,
  pu.full_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'user@example.com';

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If you get "foreign key violation" error:
-- The user doesn't exist in auth.users yet
-- Solution: Create user in Supabase Dashboard → Authentication → Users first

-- If you get "unique violation" error:
-- User already exists in public.users
-- Solution: Use UPDATE instead of INSERT, or check existing user first

-- Check for orphaned users (in public.users but not in auth.users)
SELECT pu.*
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL;

-- Check for auth users not in public.users
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

