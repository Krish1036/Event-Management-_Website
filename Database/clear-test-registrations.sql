-- Clear test registrations for payment testing
-- Run this in your Supabase SQL editor to clean up test data

-- Delete test registrations (adjust user_id or event_id as needed)
DELETE FROM registrations 
WHERE user_id = 'your-test-user-id' 
AND created_at > NOW() - INTERVAL '1 hour';

-- Or delete all registrations for a specific event
DELETE FROM registrations 
WHERE event_id = 'your-event-id';

-- Also clean up related payment records
DELETE FROM payments 
WHERE registration_id IN (
  SELECT id FROM registrations 
  WHERE user_id = 'your-test-user-id'
  AND created_at > NOW() - INTERVAL '1 hour'
);

-- Clean up registration responses
DELETE FROM registration_responses 
WHERE registration_id IN (
  SELECT id FROM registrations 
  WHERE user_id = 'your-test-user-id'
  AND created_at > NOW() - INTERVAL '1 hour'
);

-- Check remaining registrations
SELECT 
  r.id,
  r.event_id,
  r.user_id,
  r.status,
  r.created_at,
  e.title as event_title
FROM registrations r
JOIN events e ON r.event_id = e.id
WHERE r.user_id = 'your-test-user-id'
ORDER BY r.created_at DESC;
