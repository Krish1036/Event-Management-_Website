import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            // cookies.set is only allowed in Route Handlers or Server Actions.
            // When called during normal server rendering it throws; swallow and warn instead
            // so that reads (which are common in pages) do not crash.
            cookieStore.set({ name, value, ...options });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[supabase] cookies.set skipped outside Route Handler/Server Action', e);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[supabase] cookies.remove skipped outside Route Handler/Server Action', e);
          }
        }
      }
    }
  );
}
