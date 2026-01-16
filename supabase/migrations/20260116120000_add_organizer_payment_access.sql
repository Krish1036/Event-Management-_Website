-- Add organizer access to payments for their own events
-- This policy allows organizers to view payment information for registrations
-- of events they created or are assigned to

create policy "Organizer view payments for own events"
on payments for select
using (
  exists (
    select 1 from registrations r
    join events e on e.id = r.event_id
    where r.id = payments.registration_id
      and (e.created_by = auth.uid() or e.assigned_organizer = auth.uid())
  )
);
