-- Script to add pricing options to your event
-- Replace 'your-event-id' with the actual event ID

-- First, check what events exist with custom pricing
SELECT id, title, pricing_type, status FROM events WHERE pricing_type = 'custom';

-- Add pricing options for your event (replace the ID)
INSERT INTO event_pricing_options (event_id, label, price) VALUES
  ('your-event-id', 'Student', 10.00),
  ('your-event-id', 'Teacher', 20.00),
  ('your-event-id', 'Professional', 50.00);

-- Verify the options were added
SELECT * FROM event_pricing_options WHERE event_id = 'your-event-id' ORDER BY price ASC;
