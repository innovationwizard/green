-- Fix: Manager User Stuck (must_change_password = true)
-- User: Sergio Valdez (svaldez@green.com.gt)
-- ID: 4a522b63-7aa7-4898-859b-61496ff4e16d

-- ============================================
-- STEP 1: Verify current state
-- ============================================
SELECT 
  id,
  email,
  full_name,
  role,
  active,
  must_change_password,
  password_changed_at,
  created_at,
  updated_at
FROM public.users
WHERE id = '4a522b63-7aa7-4898-859b-61496ff4e16d';

-- ============================================
-- STEP 2: Check auth.users status
-- ============================================
SELECT 
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  confirmed_at,
  created_at
FROM auth.users
WHERE id = '4a522b63-7aa7-4898-859b-61496ff4e16d';

-- ============================================
-- STEP 3: FIX OPTION A - Clear flag if user has already changed password
-- ============================================
-- ⚠️ ONLY RUN THIS IF THE USER HAS ALREADY CHANGED THEIR PASSWORD
-- This clears the must_change_password flag and sets password_changed_at
UPDATE public.users
SET 
  must_change_password = false,
  password_changed_at = NOW(),
  updated_at = NOW()
WHERE id = '4a522b63-7aa7-4898-859b-61496ff4e16d'
  AND must_change_password = true;

-- Verify the fix
SELECT 
  id,
  email,
  full_name,
  role,
  active,
  must_change_password,
  password_changed_at,
  CASE 
    WHEN must_change_password = false THEN '✓ FIXED - User can now login'
    ELSE '⚠️ Still stuck'
  END as status
FROM public.users
WHERE id = '4a522b63-7aa7-4898-859b-61496ff4e16d';

-- ============================================
-- STEP 4: FIX OPTION B - Reset flag to allow password change flow
-- ============================================
-- ⚠️ ONLY RUN THIS IF YOU WANT TO FORCE USER TO CHANGE PASSWORD AGAIN
-- This resets the flag but keeps password_changed_at as null
-- (User will be redirected to /auth/reset-password on next login)
/*
UPDATE public.users
SET 
  must_change_password = true,
  password_changed_at = NULL,
  updated_at = NOW()
WHERE id = '4a522b63-7aa7-4898-859b-61496ff4e16d';
*/

-- ============================================
-- STEP 5: FIX OPTION C - Clear flag completely (skip password change requirement)
-- ============================================
-- ⚠️ ONLY RUN THIS IF YOU WANT TO SKIP THE PASSWORD CHANGE REQUIREMENT
-- This completely removes the password change requirement
/*
UPDATE public.users
SET 
  must_change_password = false,
  password_changed_at = COALESCE(password_changed_at, NOW()),
  updated_at = NOW()
WHERE id = '4a522b63-7aa7-4898-859b-61496ff4e16d';
*/

-- ============================================
-- STEP 6: Verify final state
-- ============================================
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.active,
  u.must_change_password,
  u.password_changed_at,
  au.last_sign_in_at,
  CASE 
    WHEN u.must_change_password = false AND u.active = true THEN '✓ User can login and access /manager/*'
    WHEN u.must_change_password = true THEN '⚠️ User will be redirected to /auth/reset-password'
    WHEN u.active = false THEN '⚠️ Account is inactive'
    ELSE '❓ Unknown state'
  END as access_status
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.id = '4a522b63-7aa7-4898-859b-61496ff4e16d';

