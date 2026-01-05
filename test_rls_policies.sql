-- Test RLS policies for clients table
-- Run this to verify policies are working correctly

-- Test 1: Verify function exists and works
SELECT public.is_admin_or_developer() as is_admin_dev;

-- Test 2: Check current user role
SELECT 
  id,
  email,
  role,
  (SELECT public.is_admin_or_developer()) as can_insert_clients
FROM public.users
WHERE id = auth.uid();

-- Test 3: Try to insert a test client (will fail if policies don't allow)
-- Uncomment to test:
/*
INSERT INTO public.clients (name, created_by)
VALUES ('Test Client RLS', auth.uid())
RETURNING id, name;
*/

-- Test 4: Check all policies for clients table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'clients' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Test 5: Verify function can be called
DO $$
BEGIN
  IF public.is_admin_or_developer() THEN
    RAISE NOTICE 'Current user IS admin or developer';
  ELSE
    RAISE NOTICE 'Current user is NOT admin or developer';
  END IF;
END $$;

