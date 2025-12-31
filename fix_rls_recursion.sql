-- Fix: Infinite Recursion in RLS Policy for users table
-- This creates a SECURITY DEFINER function to check user role without triggering RLS

-- Step 1: Create a function to check if current user is admin/developer
-- SECURITY DEFINER allows it to bypass RLS when checking roles
CREATE OR REPLACE FUNCTION public.is_admin_or_developer()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role user_role;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'developer');
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN FALSE;
END;
$$;

-- Step 2: Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Step 3: Create new policy using the function (no recursion)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin_or_developer()
  );

-- Step 4: Fix other policies that might have the same issue
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE USING (public.is_admin_or_developer());

-- Step 5: Verify all policies were created correctly
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- Test: This should work without recursion
-- SELECT * FROM public.users WHERE id = auth.uid();

