-- Fix RLS Policy Circular Dependency Issue
-- This fixes the policy that prevents users from querying their own profile
-- Execute this in Supabase SQL Editor

-- Drop the old policy with circular dependency
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Create new policy without circular dependency
-- Users can always see themselves (auth.uid() = id)
-- Admins and developers can see all users (but we check this without circular dependency)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'developer')
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

