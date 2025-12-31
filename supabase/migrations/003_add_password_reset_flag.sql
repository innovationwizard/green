-- Migration: Add password reset requirement flag
-- This forces users to change their password after first login

-- Add column to track if user must change password
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;

-- Add column to track when password was last changed
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Update existing users to not require password change (they've already logged in)
-- Only new users will be required to change password
UPDATE public.users
SET must_change_password = false
WHERE password_changed_at IS NOT NULL;

-- For users created before this migration, set password_changed_at to created_at
-- This assumes they've already changed their password
UPDATE public.users
SET password_changed_at = created_at
WHERE password_changed_at IS NULL AND must_change_password = false;

-- Add comment to column
COMMENT ON COLUMN public.users.must_change_password IS 'If true, user must change password on next login';
COMMENT ON COLUMN public.users.password_changed_at IS 'Timestamp when user last changed their password';

