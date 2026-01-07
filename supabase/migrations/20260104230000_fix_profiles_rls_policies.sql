-- Fix profiles RLS policies - add missing basic policies

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create basic policies for profiles table

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

-- Helper function to perform organizer -> registrations/events check with RLS disabled
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

-- Organizer policy using helper function to avoid recursion
DROP POLICY IF EXISTS "Organizer view profiles for registered users" ON public.profiles;

CREATE POLICY "Organizer view profiles for registered users"
  ON public.profiles
  FOR SELECT
  USING (
    is_admin_by_email()
    OR auth.uid() = id
    OR can_organizer_view_profile(id)
  );
