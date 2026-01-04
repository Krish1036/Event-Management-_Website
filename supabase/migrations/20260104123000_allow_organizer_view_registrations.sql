-- Allow organizers to view registrations for events they created or are assigned to

DROP POLICY IF EXISTS "Organizer view registrations for own events" ON public.registrations;

CREATE POLICY "Organizer view registrations for own events"
  ON public.registrations
  FOR SELECT
  USING (
    -- Organizer can view registrations if they created the event or are assigned to it
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = registrations.event_id
        AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
    )
    -- Also allow the registering user to view their own registration
    OR user_id = auth.uid()
    -- Always allow admins
    OR is_admin_by_email()
  );
