-- Alternative approach: Simple RLS policy without is_admin_by_email() dependency
-- This avoids potential recursion or timing issues during signup

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;

-- Simple policy: Users can insert their own profile (no admin check needed during signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Separate policy for admins to insert any profile
CREATE POLICY "Admins can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (is_admin_by_email());

-- Verify policies
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
WHERE tablename = 'profiles' AND cmd = 'INSERT'
ORDER BY policyname;
