-- Debug RLS policies for clients table
-- Run this as the admin user experiencing the issue

-- Step 1: Check current user and role
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email,
  (SELECT role FROM public.users WHERE id = auth.uid()) as current_user_role,
  public.is_admin_or_developer() as is_admin_or_dev_function_result;

-- Step 2: Verify the function exists and works
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'is_admin_or_developer';

-- Step 3: Check all policies for clients table (including WITH CHECK)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'clients' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Step 4: Test if current user can insert (this will show the actual error)
-- Uncomment the line below to test:
-- INSERT INTO public.clients (name, created_by) VALUES ('Test RLS', auth.uid()) RETURNING *;

-- Step 5: Check if user exists in public.users table
SELECT 
  id,
  email,
  role,
  active
FROM public.users
WHERE id = auth.uid();

-- Step 6: Manual test of the function logic
DO $$
DECLARE
  user_role_val user_role;
  is_admin_dev BOOLEAN;
BEGIN
  SELECT role INTO user_role_val
  FROM public.users
  WHERE id = auth.uid();
  
  is_admin_dev := user_role_val IN ('admin', 'developer');
  
  RAISE NOTICE 'User role: %, Is admin/dev: %', user_role_val, is_admin_dev;
END $$;

