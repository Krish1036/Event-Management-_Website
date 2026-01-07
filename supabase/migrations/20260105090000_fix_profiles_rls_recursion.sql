-- Prevent infinite recursion in profiles RLS by moving organizer check into a security-definer function

-- Create helper function that checks whether current user (auth.uid()) is an organizer
-- for the given profile_id by inspecting registrations/events with RLS turned OFF inside the function.
-- The function runs as SECURITY DEFINER so it doesn't re-trigger RLS policies on the referenced tables.

CREATE OR REPLACE FUNCTION can_organizer_view_profile(p_profile uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Temporarily disable RLS for the duration of this check to avoid circular policy evaluation
  -- Use EXECUTE so the command runs with current function privileges
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

-- Replace the "Organizer view profiles for registered users" policy to use the new function
DROP POLICY IF EXISTS "Organizer view profiles for registered users" ON public.profiles;

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
