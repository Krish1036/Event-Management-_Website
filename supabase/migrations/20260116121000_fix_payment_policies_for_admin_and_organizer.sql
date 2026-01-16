-- Fix payment policies to allow both admins and organizers to access payment data
-- This replaces the existing admin-only policy with comprehensive access control

-- First, drop existing payment policies to avoid conflicts
DROP POLICY IF EXISTS "Admin manage payments" ON public.payments;
DROP POLICY IF EXISTS "Organizer view payments for own events" ON public.payments;

-- Create comprehensive payment policies for both admins and organizers

-- Policy for admins to access all payments
CREATE POLICY "Admin access all payments" 
ON public.payments FOR ALL
USING (is_admin_by_email());

-- Policy for organizers to access payments for their own events
CREATE POLICY "Organizer access payments for own events"
ON public.payments FOR SELECT
USING (
  -- Allow organizers to view payments for events they created or are assigned to
  EXISTS (
    SELECT 1 
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = public.payments.registration_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);

-- Also allow organizers to insert/update payments for their events
CREATE POLICY "Organizer manage payments for own events"
ON public.payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = public.payments.registration_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);

CREATE POLICY "Organizer update payments for own events"
ON public.payments FOR UPDATE USING (
  EXISTS (
    SELECT 1 
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = public.payments.registration_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);
