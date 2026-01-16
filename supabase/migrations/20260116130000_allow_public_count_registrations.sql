-- Allow public users to count registrations for events
-- This enables the capacity display to show correct counts for logged-out users

-- Create a function to count registrations that bypasses RLS
CREATE OR REPLACE FUNCTION public.count_event_registrations(event_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER -- This bypasses RLS
AS $$
  SELECT COUNT(*)
  FROM public.registrations
  WHERE event_id = event_uuid
    AND status IN ('PENDING', 'CONFIRMED');
$$;

-- Grant execute permission to everyone (including anonymous users)
GRANT EXECUTE ON FUNCTION public.count_event_registrations(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.count_event_registrations(UUID) TO authenticated;
