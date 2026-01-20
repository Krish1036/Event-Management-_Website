-- Comprehensive RLS fix for profiles table
-- This will completely reset RLS policies for profiles

-- First, let's see ALL policies on profiles table
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
WHERE tablename = 'profiles'
ORDER BY policyname, cmd;

-- Drop ALL policies on profiles table
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Organizer view profiles for registered users" ON public.profiles;

-- Recreate all necessary policies with correct logic

-- SELECT policies
CREATE POLICY "Admin can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin_by_email());

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id AND NOT is_admin_by_email());

CREATE POLICY "Organizer view profiles for registered users"
  ON public.profiles
  FOR SELECT
  USING (
    -- Admins can always view
    is_admin_by_email()
    -- Users can view their own profile
    OR id = auth.uid()
    -- Organizers can view profiles of users who have registrations for events they created or are assigned to
    OR EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE r.user_id = public.profiles.id
        AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
    )
  );

-- UPDATE policies
CREATE POLICY "Admin can update all profiles"
ON public.profiles FOR UPDATE
USING (is_admin_by_email());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id AND NOT is_admin_by_email());

-- INSERT policies - the key fix
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert any profile"
ON public.profiles FOR INSERT
WITH CHECK (is_admin_by_email());

-- Verify final policies
SELECT 
    'Final policies for profiles table:' as info;
    
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
WHERE tablename = 'profiles'
ORDER BY policyname, cmd;
