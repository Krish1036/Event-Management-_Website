-- Migration: Add Custom Pricing Support
-- Adds support for custom pricing options in events

-- Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS pricing_dropdown_label TEXT;

-- Add constraint for pricing_type values
ALTER TABLE events 
ADD CONSTRAINT pricing_type_check 
CHECK (pricing_type IN ('free', 'paid', 'custom'));

-- Create event_pricing_options table
CREATE TABLE IF NOT EXISTS event_pricing_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for event_pricing_options
CREATE INDEX idx_event_pricing_options_event_id ON event_pricing_options(event_id);
CREATE INDEX idx_event_pricing_options_price ON event_pricing_options(price);

-- Add new columns to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS pricing_option_id uuid REFERENCES event_pricing_options(id),
ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) DEFAULT 0;

-- Add constraint for registrations pricing_type
ALTER TABLE registrations 
ADD CONSTRAINT registrations_pricing_type_check 
CHECK (pricing_type IN ('free', 'paid', 'custom'));

-- Update existing events to have proper pricing_type based on price
UPDATE events 
SET pricing_type = CASE 
  WHEN price > 0 THEN 'paid' 
  ELSE 'free' 
END 
WHERE pricing_type IS NULL OR pricing_type = 'free';

-- Update existing registrations to have proper pricing_type
UPDATE registrations 
SET pricing_type = CASE 
  WHEN EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = registrations.event_id 
    AND e.price > 0
  ) THEN 'paid' 
  ELSE 'free' 
END 
WHERE pricing_type IS NULL;

-- Update paid_amount for existing paid registrations
UPDATE registrations 
SET paid_amount = (
  SELECT e.price 
  FROM events e 
  WHERE e.id = registrations.event_id
)
WHERE pricing_type = 'paid' AND paid_amount = 0;

-- Enable RLS on event_pricing_options
ALTER TABLE event_pricing_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_pricing_options
CREATE POLICY "Admin can manage all pricing options"
ON event_pricing_options FOR ALL
USING (is_admin_by_email());

CREATE POLICY "Organizer can manage pricing options for their events"
ON event_pricing_options FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_pricing_options.event_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);

CREATE POLICY "Public can view pricing options for approved events"
ON event_pricing_options FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_pricing_options.event_id
      AND e.status = 'approved'
  )
);

-- Update existing registrations table policies to include new columns
DROP POLICY IF EXISTS "User view own registrations" ON registrations;
CREATE POLICY "User view own registrations"
ON registrations FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manage registrations" ON registrations;
CREATE POLICY "Admin manage registrations"
ON registrations FOR ALL
USING (is_admin_by_email());

-- Add organizer access to registrations for their events
CREATE POLICY "Organizer can view registrations for their events"
ON registrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registrations.event_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);

CREATE POLICY "Organizer can update registrations for their events"
ON registrations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registrations.event_id
      AND (e.created_by = auth.uid() OR e.assigned_organizer = auth.uid())
  )
);

-- Function to get pricing options for an event
CREATE OR REPLACE FUNCTION get_event_pricing_options(p_event_id uuid)
RETURNS TABLE(id uuid, label text, price numeric, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    epo.id, 
    epo.label, 
    epo.price, 
    epo.created_at
  FROM event_pricing_options epo
  WHERE epo.event_id = p_event_id
  ORDER BY epo.price ASC, epo.label ASC;
$$;

-- Function to validate pricing option belongs to event
CREATE OR REPLACE FUNCTION validate_pricing_option(
  p_event_id uuid, 
  p_pricing_option_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_pricing_options
    WHERE event_id = p_event_id 
      AND id = p_pricing_option_id
  );
$$;

-- Update the is_paid generated column to consider custom pricing
ALTER TABLE events 
DROP COLUMN IF EXISTS is_paid;

ALTER TABLE events 
ADD COLUMN is_paid boolean GENERATED ALWAYS AS (
  (pricing_type = 'paid' AND price > 0) OR 
  (pricing_type = 'custom')
) STORED;

-- Add comments for documentation
COMMENT ON COLUMN events.pricing_type IS 'Type of pricing: free, paid, or custom';
COMMENT ON COLUMN events.pricing_dropdown_label IS 'Label for custom pricing dropdown (e.g., "Select Category")';
COMMENT ON TABLE event_pricing_options IS 'Pricing options for custom pricing events';
COMMENT ON COLUMN registrations.pricing_type IS 'Type of pricing used for this registration';
COMMENT ON COLUMN registrations.pricing_option_id IS 'Selected pricing option for custom pricing events';
COMMENT ON COLUMN registrations.paid_amount IS 'Actual amount paid for this registration';
