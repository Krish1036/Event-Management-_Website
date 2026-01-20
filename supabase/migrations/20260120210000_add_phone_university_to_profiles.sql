-- Add phone_number and university columns to profiles table
-- Migration: Add user signup extension fields

ALTER TABLE profiles
ADD COLUMN phone_number text,
ADD COLUMN university text;

-- Add comments for documentation
COMMENT ON COLUMN profiles.phone_number IS 'User phone number collected during signup';
COMMENT ON COLUMN profiles.university IS 'User university collected during signup';

-- Note: These columns are nullable to maintain backward compatibility
-- New signup flow will require these fields, but existing users may have NULL values
