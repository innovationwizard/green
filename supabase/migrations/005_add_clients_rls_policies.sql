-- Migration: Add RLS policies for clients and projects tables
-- Allows admin and developer roles to manage clients and projects (CRUD operations)

-- Ensure the SECURITY DEFINER function exists (created in migration 004_fix_user_creation.sql)
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

-- SELECT policy: Admins, developers, and managers can view all clients
DROP POLICY IF EXISTS "Admins can view clients" ON public.clients;
CREATE POLICY "Admins can view clients" ON public.clients
  FOR SELECT USING (public.is_admin_or_developer() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager');

-- INSERT policy: Admins and developers can create clients
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
CREATE POLICY "Admins can insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

-- UPDATE policy: Admins and developers can update clients
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
CREATE POLICY "Admins can update clients" ON public.clients
  FOR UPDATE USING (public.is_admin_or_developer());

-- DELETE policy: Admins and developers can delete clients (soft delete via active flag)
-- Note: We use UPDATE to set active=false instead of DELETE for audit trail
-- But we'll allow DELETE for admins if needed
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE USING (public.is_admin_or_developer());

-- Projects policies: Admins and developers can manage projects
-- SELECT policy already exists, but we need INSERT, UPDATE, DELETE

-- INSERT policy: Admins and developers can create projects
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
CREATE POLICY "Admins can insert projects" ON public.projects
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

-- UPDATE policy: Admins and developers can update projects
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
CREATE POLICY "Admins can update projects" ON public.projects
  FOR UPDATE USING (public.is_admin_or_developer());

-- DELETE policy: Admins and developers can delete projects
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE USING (public.is_admin_or_developer());

-- Quotes policies: Admins and developers can manage quotes
-- SELECT policy
DROP POLICY IF EXISTS "Admins can view quotes" ON public.quotes;
CREATE POLICY "Admins can view quotes" ON public.quotes
  FOR SELECT USING (public.is_admin_or_developer() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager');

-- INSERT policy: Admins and developers can create quotes
DROP POLICY IF EXISTS "Admins can insert quotes" ON public.quotes;
CREATE POLICY "Admins can insert quotes" ON public.quotes
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

-- UPDATE policy: Admins and developers can update quotes
DROP POLICY IF EXISTS "Admins can update quotes" ON public.quotes;
CREATE POLICY "Admins can update quotes" ON public.quotes
  FOR UPDATE USING (public.is_admin_or_developer());

-- DELETE policy: Admins and developers can delete quotes
DROP POLICY IF EXISTS "Admins can delete quotes" ON public.quotes;
CREATE POLICY "Admins can delete quotes" ON public.quotes
  FOR DELETE USING (public.is_admin_or_developer());

-- Quote line items policies: Admins and developers can manage quote line items
-- Since only admins/developers can create quotes, they can manage line items too
-- SELECT policy
DROP POLICY IF EXISTS "Admins can view quote line items" ON public.quote_line_items;
CREATE POLICY "Admins can view quote line items" ON public.quote_line_items
  FOR SELECT USING (public.is_admin_or_developer() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager');

-- INSERT policy: Admins and developers can create quote line items
DROP POLICY IF EXISTS "Admins can insert quote line items" ON public.quote_line_items;
CREATE POLICY "Admins can insert quote line items" ON public.quote_line_items
  FOR INSERT WITH CHECK (public.is_admin_or_developer());

-- UPDATE policy: Admins and developers can update quote line items
DROP POLICY IF EXISTS "Admins can update quote line items" ON public.quote_line_items;
CREATE POLICY "Admins can update quote line items" ON public.quote_line_items
  FOR UPDATE USING (public.is_admin_or_developer());

-- DELETE policy: Admins and developers can delete quote line items
DROP POLICY IF EXISTS "Admins can delete quote line items" ON public.quote_line_items;
CREATE POLICY "Admins can delete quote line items" ON public.quote_line_items
  FOR DELETE USING (public.is_admin_or_developer());

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('clients', 'projects', 'quotes', 'quote_line_items') AND schemaname = 'public'
ORDER BY tablename, policyname;

