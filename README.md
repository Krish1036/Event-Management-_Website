# Event-Management-_Website

## Database migrations (notes) 🔧

- Added migration `supabase/migrations/20260104210000_allow_organizer_view_profiles.sql` to allow users with the `organizer` role to SELECT `profiles` for users who have registrations for events they created or are assigned to.
- To apply this change in a deployment, run your normal Supabase migration/apply steps (e.g. `supabase db push` or your CI migration job).
