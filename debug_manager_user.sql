-- Debug SQL for Manager User Issues
-- Execute these queries in Supabase SQL Editor to diagnose the problem

-- ============================================
-- 1. Find the manager user(s)
-- ============================================
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.active,
  u.must_change_password,
  u.password_changed_at,
  u.created_at,
  u.updated_at,
  au.email_confirmed_at,
  au.last_sign_in_at,
  au.confirmed_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.role = 'manager'
ORDER BY u.created_at DESC;

-- ============================================
-- 2. Check if manager user exists in auth.users
-- ============================================
-- Replace 'manager@email.com' with the actual manager email
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.last_sign_in_at,
  au.confirmed_at,
  au.created_at,
  CASE 
    WHEN pu.id IS NULL THEN 'NOT IN public.users - USER MISSING!'
    ELSE 'EXISTS in public.users'
  END as public_users_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'manager@email.com'  -- REPLACE WITH ACTUAL EMAIL
   OR au.email LIKE '%manager%';  -- Or use this to find manager emails

-- ============================================
-- 3. Check manager user's must_change_password flag
-- ============================================
-- Replace 'manager@email.com' with the actual manager email
SELECT 
  id,
  email,
  full_name,
  role,
  must_change_password,
  password_changed_at,
  active,
  CASE 
    WHEN must_change_password = true THEN '⚠️ USER STUCK - Must change password'
    WHEN active = false THEN '⚠️ USER STUCK - Account inactive'
    ELSE '✓ User should be able to login'
  END as status
FROM public.users
WHERE email = 'manager@email.com'  -- REPLACE WITH ACTUAL EMAIL
   OR role = 'manager';

-- ============================================
-- 4. Check RLS policies for manager role
-- ============================================
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
WHERE tablename = 'users' 
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- 5. Test if manager can query their own profile (RLS test)
-- ============================================
-- This simulates what happens when manager tries to login
-- Replace 'MANAGER_USER_ID_HERE' with the actual UUID from query #1
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'MANAGER_USER_ID_HERE';  -- REPLACE WITH ACTUAL UUID

SELECT 
  id,
  email,
  role,
  must_change_password,
  active
FROM public.users
WHERE id = 'MANAGER_USER_ID_HERE';  -- REPLACE WITH ACTUAL UUID

RESET ROLE;

-- ============================================
-- 6. Check for all users with must_change_password = true (stuck users)
-- ============================================
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.must_change_password,
  u.password_changed_at,
  u.active,
  au.last_sign_in_at,
  CASE 
    WHEN u.must_change_password = true AND u.password_changed_at IS NULL THEN '⚠️ STUCK - Password never changed'
    WHEN u.must_change_password = true AND u.password_changed_at IS NOT NULL THEN '⚠️ STUCK - Flag not cleared after password change'
    WHEN u.active = false THEN '⚠️ STUCK - Account inactive'
    ELSE '✓ OK'
  END as issue
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.must_change_password = true
   OR u.active = false
ORDER BY u.role, u.email;

-- ============================================
-- 7. Fix: Clear must_change_password flag for manager (if needed)
-- ============================================
-- ⚠️ ONLY RUN THIS IF YOU'RE SURE THE USER HAS CHANGED THEIR PASSWORD
-- Replace 'manager@email.com' with the actual manager email
/*
UPDATE public.users
SET 
  must_change_password = false,
  password_changed_at = COALESCE(password_changed_at, NOW())
WHERE email = 'manager@email.com'  -- REPLACE WITH ACTUAL EMAIL
  AND role = 'manager';

-- Verify the fix
SELECT id, email, role, must_change_password, password_changed_at, active
FROM public.users
WHERE email = 'manager@email.com';
*/

-- ============================================
-- 8. Fix: Activate manager account if inactive
-- ============================================
-- ⚠️ ONLY RUN THIS IF THE ACCOUNT SHOULD BE ACTIVE
-- Replace 'manager@email.com' with the actual manager email
/*
UPDATE public.users
SET active = true
WHERE email = 'manager@email.com'  -- REPLACE WITH ACTUAL EMAIL
  AND role = 'manager'
  AND active = false;

-- Verify the fix
SELECT id, email, role, active, must_change_password
FROM public.users
WHERE email = 'manager@email.com';
*/

-- ============================================
-- 9. Check manager layout access
-- ============================================
-- Verify manager can access manager routes
SELECT 
  u.id,
  u.email,
  u.role,
  u.active,
  u.must_change_password,
  CASE 
    WHEN u.role = 'manager' AND u.active = true AND u.must_change_password = false THEN '✓ Can access /manager/*'
    WHEN u.role = 'manager' AND u.must_change_password = true THEN '⚠️ Redirected to /auth/reset-password'
    WHEN u.role = 'manager' AND u.active = false THEN '⚠️ Account inactive - cannot access'
    ELSE '❓ Unknown issue'
  END as access_status
FROM public.users u
WHERE u.role = 'manager';

-- ============================================
-- 10. Complete diagnostic for specific manager user
-- ============================================
-- Replace 'manager@email.com' with the actual manager email
-- This gives you a complete picture of the user's state
SELECT 
  '=== AUTH.USERS ===' as section,
  au.id::text as id,
  au.email,
  au.email_confirmed_at::text as email_confirmed_at,
  au.last_sign_in_at::text as last_sign_in_at,
  au.confirmed_at::text as confirmed_at,
  NULL::text as role,
  NULL::boolean as active,
  NULL::boolean as must_change_password
FROM auth.users au
WHERE au.email = 'manager@email.com'  -- REPLACE WITH ACTUAL EMAIL

UNION ALL

SELECT 
  '=== PUBLIC.USERS ===' as section,
  pu.id::text as id,
  pu.email,
  NULL::text as email_confirmed_at,
  NULL::text as last_sign_in_at,
  NULL::text as confirmed_at,
  pu.role::text as role,
  pu.active,
  pu.must_change_password
FROM public.users pu
WHERE pu.email = 'manager@email.com'  -- REPLACE WITH ACTUAL EMAIL

ORDER BY section, id;

