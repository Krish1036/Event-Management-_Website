import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createSafeSupabaseClient(): SupabaseClient {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Only set cookies in Server Actions or Route Handlers
          // During SSR, we silently ignore cookie setting to prevent errors
          if (typeof window === 'undefined') {
            // We're on the server, check if we're in a Server Action or Route Handler
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Silently ignore cookie setting errors during SSR
              // This is expected behavior and doesn't affect functionality
              console.debug('Cookie setting ignored during SSR:', name)
            }
          }
        },
        remove(name: string, options: any) {
          // Only remove cookies in Server Actions or Route Handlers
          if (typeof window === 'undefined') {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Silently ignore cookie removal errors during SSR
              console.debug('Cookie removal ignored during SSR:', name)
            }
          }
        },
      },
    }
  )
}

// Legacy export for backward compatibility
export const getSupabaseServerClient = createSafeSupabaseClient
