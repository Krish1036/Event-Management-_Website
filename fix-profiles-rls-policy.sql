-- Fix RLS policy to allow users to insert their own profile during signup
-- This resolves the "new row violates row-level security policy" error

-- Drop the existing restrictive insert policy
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;

-- Create new policies that allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Users can insert their own profile (for signup)
    id = auth.uid()
    AND NOT is_admin_by_email()
  );

-- Admins can still insert any profile
CREATE POLICY "Admins can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (is_admin_by_email());

-- Verify the policies were created
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
WHERE tablename = 'profiles' AND cmd = 'INSERT';
