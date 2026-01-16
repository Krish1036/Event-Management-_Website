-- Fix attendance policies to properly restrict organizers to their own events
-- This replaces the existing policy with proper access control

-- First, drop the existing policy
DROP POLICY IF EXISTS "Admin & organizer attendance" ON public.attendance;

-- Create comprehensive attendance policies for both admins and organizers

-- Policy for admins to access all attendance
CREATE POLICY "Admin access all attendance" 
ON public.attendance FOR ALL
USING (is_admin_by_email());

-- Policy for organizers to access attendance only for their own events
CREATE POLICY "Organizer access attendance for own events"
ON public.attendance FOR SELECT
USING (
  -- Allow organizers to view attendance for events they created or are assigned to
  EXISTS (
    SELECT 1 
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = public.attendance.registration_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);

-- Also allow organizers to insert attendance for their events
CREATE POLICY "Organizer insert attendance for own events"
ON public.attendance FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = public.attendance.registration_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);
