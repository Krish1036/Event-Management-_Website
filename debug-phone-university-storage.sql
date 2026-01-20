-- Test script to verify phone_number and university columns exist and are working
-- Run this in Supabase SQL Editor to debug the issue

-- 1. Check if columns exist in profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('phone_number', 'university')
ORDER BY column_name;

-- 2. Check recent profiles to see if phone_number and university are being stored
SELECT 
    id, 
    full_name, 
    email, 
    phone_number, 
    university, 
    role, 
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if there are any NULL values for new fields
SELECT 
    COUNT(*) as total_profiles,
    COUNT(phone_number) as profiles_with_phone,
    COUNT(university) as profiles_with_university,
    COUNT(*) - COUNT(phone_number) as missing_phone,
    COUNT(*) - COUNT(university) as missing_university
FROM profiles;

-- 4. Test inserting a sample profile with the new fields
-- (This will help identify if there are permission issues)
INSERT INTO profiles (
    id, 
    full_name, 
    email, 
    phone_number, 
    university, 
    role, 
    created_at
) VALUES (
    'test-profile-' || EXTRACT(EPOCH FROM NOW())::text,
    'Test User',
    'test-' || EXTRACT(EPOCH FROM NOW())::text || '@example.com',
    '9876543210',
    'Ganpat University - U. V. Patel College of Engineering',
    'student',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 5. Verify the test record was inserted
SELECT id, full_name, email, phone_number, university, role, created_at
FROM profiles 
WHERE full_name = 'Test User'
ORDER BY created_at DESC
LIMIT 1;

-- 6. Check RLS policies that might be blocking the insert
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';
