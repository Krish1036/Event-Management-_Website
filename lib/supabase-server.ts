import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  return createServerComponentClient(
    { cookies: () => cookieStore }
  );
}
