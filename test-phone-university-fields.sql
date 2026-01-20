-- Test script to verify phone_number and university columns work correctly
-- This can be run in Supabase SQL Editor to test the new functionality

-- 1. Check if columns exist in profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('phone_number', 'university')
ORDER BY column_name;

-- 2. Test inserting a new user profile with the new fields
-- (This is just for testing - in production this would be done via the signup flow)
INSERT INTO profiles (
  id, 
  full_name, 
  email, 
  phone_number, 
  university, 
  role, 
  created_at
) VALUES (
  gen_random_uuid(),
  'Test User',
  'test@example.com',
  '9876543210',
  'Ganpat University - U. V. Patel College of Engineering',
  'student',
  NOW()
);

-- 3. Query the test record to verify it was saved correctly
SELECT id, full_name, email, phone_number, university, role, created_at
FROM profiles 
WHERE email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Clean up the test record (optional)
-- DELETE FROM profiles WHERE email = 'test@example.com';

-- 5. Test different university formats
SELECT 
  'Ganpat University - Institute of Computer Technology' as ganpat_format,
  'Other University Name' as other_format,
  'Ganpat University - Department of Computer Science' as dept_format;
