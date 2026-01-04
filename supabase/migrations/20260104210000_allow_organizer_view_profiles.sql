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
    -- Organizers can view profiles of users who have registrations for events they created or are assigned to
    OR EXISTS (
      SELECT 1 FROM public.registrations r
      JOIN public.events e ON e.id = r.event_id
      WHERE r.user_id = public.profiles.id
        AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
    )
  );
