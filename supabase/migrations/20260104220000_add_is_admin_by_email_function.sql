-- Function to check if user is admin based on email (avoid querying profiles to prevent RLS recursion)
create or replace function is_admin_by_email()
returns boolean
language sql
security definer
as $$
  -- Check if user is admin by email only.
  -- Note: avoiding a SELECT from `profiles` here prevents infinite recursion when this
  -- function is used by RLS policies on the `profiles` table.
  select 
    case 
      when (
        select email from auth.users where id = auth.uid()
      ) in ('krshthakore@gmail.com', 'admin@university.edu') then true
      else false
    end;
$$;
