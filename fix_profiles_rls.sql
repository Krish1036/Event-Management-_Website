-- Execute this directly in Supabase SQL Editor to fix the profiles RLS issue

-- 1. Create the missing function
CREATE OR REPLACE FUNCTION is_admin_by_email()
RETURNS boolean
LANGUAGE sql
SECURITY definer
AS $$
  SELECT 
    CASE 
      WHEN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ) IN ('krshthakore@gmail.com', 'admin@university.edu') THEN true
      ELSE false
    END;
$$;

-- 2. Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Organizer view profiles for registered users" ON public.profiles;

-- 4. Create basic policies for profiles table

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin_by_email());

-- Users can view own profile (but not admins, they use the admin policy)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id AND NOT is_admin_by_email());

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (is_admin_by_email());

-- Users can update own profile (but not admins, they use the admin policy)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id AND NOT is_admin_by_email());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Add the organizer policy last (depends on the function)

-- Helper function that performs the organizer -> registrations/events check with RLS disabled
CREATE OR REPLACE FUNCTION can_organizer_view_profile(p_profile uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  EXECUTE 'SET LOCAL row_security = off';

  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.user_id = p_profile
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

CREATE POLICY "Organizer view profiles for registered users"
  ON public.profiles
  FOR SELECT
  USING (
    -- Admins can always view
    is_admin_by_email()
    -- Users can view their own profile
    OR auth.uid() = id
    -- Organizers can view via helper function that bypasses RLS during the check
    OR can_organizer_view_profile(id)
  );
