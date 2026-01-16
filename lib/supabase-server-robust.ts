import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// A more robust server client that handles SSR edge cases
export function createRobustSupabaseClient(): SupabaseClient {
  let cookieStore
  
  try {
    cookieStore = cookies()
  } catch (error) {
    // If cookies() fails (e.g., during build time), create a mock cookie store
    console.debug('Failed to access cookies, using mock store:', error)
    cookieStore = {
      get: () => undefined,
      set: () => {},
      getAll: () => [],
      has: () => false,
      delete: () => {},
    }
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value
          } catch {
            return undefined
          }
        },
        set(name: string, value: string, options: any) {
          // Completely silent during SSR - this prevents all cookie-related errors
          // Auth state will be handled properly on the client side
        },
        remove(name: string, options: any) {
          // Completely silent during SSR - this prevents all cookie-related errors
          // Auth state will be handled properly on the client side
        }
      }
    }
  )
}

// Export with the same name for backward compatibility
export const getSupabaseServerClient = createRobustSupabaseClient
