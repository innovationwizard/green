-- Migration: Fix user creation and RLS policies
-- This migration ensures users can be created automatically and fixes RLS circular dependency

-- First, create a function to handle new user creation automatically
-- This function will be called by a trigger when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'installer', -- Default role, can be changed by admin
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user in public.users when they sign up
-- Note: This only works if users sign up through Supabase Auth
-- For manually created users in Auth Dashboard, they still need to be created manually in public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix RLS policy for users table to allow users to see themselves
-- The previous policy had a circular dependency issue
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'developer')
    )
  );

-- Allow users to insert their own profile (for the trigger function)
-- This is needed for the automatic user creation trigger
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admins and developers to insert users (for manual user creation)
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'developer')
    )
  );

-- Allow admins and developers to update users
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'developer')
    )
  );

-- Note: For existing users that were created manually in auth.users but don't have
-- a corresponding row in public.users, they need to be created manually:
--
-- INSERT INTO public.users (id, email, full_name, role)
-- VALUES (
--   '<user_id_from_auth_users>',
--   '<user_email>',
--   '<user_full_name>',
--   'installer' -- or 'admin', 'manager', 'developer' as needed
-- );

