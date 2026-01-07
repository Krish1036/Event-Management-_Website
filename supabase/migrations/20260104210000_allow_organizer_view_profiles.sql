-- Allow organizers to view profiles for users registered to events they manage

DROP POLICY IF EXISTS "Organizer view profiles for registered users" ON public.profiles;

CREATE POLICY "Organizer view profiles for registered users"
  ON public.profiles
  FOR SELECT
  USING (
    -- Admins can always view
    is_admin_by_email()
    -- Users can view their own profile
    OR id = auth.uid()
    -- Organizers can view via helper function that bypasses RLS during the check
    OR can_organizer_view_profile(id)
  );
