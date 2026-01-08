-- Add image_url column to events table
ALTER TABLE events 
ADD COLUMN image_url text;

-- Add comment to describe the column
COMMENT ON COLUMN events.image_url IS 'URL of the event image/logo';
