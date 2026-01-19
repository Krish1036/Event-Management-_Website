-- Check your current event and pricing options
-- Replace 'your-event-id' with the actual event ID from the browser console

-- 1. Check the specific event details
SELECT 
  id, 
  title, 
  pricing_type, 
  status,
  pricing_dropdown_label 
FROM events 
WHERE id = 'your-event-id';

-- 2. Check if pricing options exist for this event
SELECT 
  id, 
  event_id, 
  label, 
  price, 
  created_at 
FROM event_pricing_options 
WHERE event_id = 'your-event-id' 
ORDER BY price ASC, label ASC;

-- 3. Check all custom pricing events and their options
SELECT 
  e.id as event_id,
  e.title as event_title,
  e.pricing_type,
  COUNT(epo.id) as pricing_options_count
FROM events e
LEFT JOIN event_pricing_options epo ON e.id = epo.event_id
WHERE e.pricing_type = 'custom'
GROUP BY e.id, e.title, e.pricing_type
ORDER BY e.created_at DESC;
