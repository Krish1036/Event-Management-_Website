-- Fix RLS policy to allow users to insert their own profile during signup
-- This script handles existing policies gracefully

-- First, let's see what policies currently exist
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

-- Drop all existing INSERT policies on profiles to start fresh
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;

-- Create the correct policies for profile insertion
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

-- Verify the final policies
SELECT 
    'Final INSERT policies for profiles:' as info;
    
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
WHERE tablename = 'profiles' AND cmd = 'INSERT'
ORDER BY policyname;
