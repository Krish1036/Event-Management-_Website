-- Add visibility column to events table
ALTER TABLE events ADD COLUMN visibility TEXT DEFAULT 'public';

-- Add index for better performance
CREATE INDEX idx_events_visibility ON events(visibility);

-- Update existing records to have 'public' as default
UPDATE events SET visibility = 'public' WHERE visibility IS NULL;
