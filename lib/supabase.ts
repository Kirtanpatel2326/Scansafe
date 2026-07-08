import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(url && key)

let client: SupabaseClient | null = null

const notConfiguredError = {
  message:
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  name: 'SupabaseNotConfigured',
  status: 500,
}

// A safe stub that mimics the parts of the Supabase client this app uses,
// so the UI renders normally (as a signed-out user) when env vars are missing.
function createStubClient(): SupabaseClient {
  const stub = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: (_callback: unknown) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithOAuth: async () => ({ data: null, error: notConfiguredError }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: notConfiguredError }),
      signUp: async () => ({ data: { user: null, session: null }, error: notConfiguredError }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ data: null, error: notConfiguredError }),
    },
    from: () => {
      const queryStub: Record<string, unknown> = {}
      const chain = new Proxy(queryStub, {
        get(_t, prop) {
          if (prop === 'then') {
            // Make it awaitable: resolves like a failed/empty query
            return (resolve: (value: unknown) => void) =>
              resolve({ data: null, error: notConfiguredError })
          }
          return () => chain
        },
      })
      return chain
    },
  }
  return stub as unknown as SupabaseClient
}

function getClient(): SupabaseClient {
  if (!client) {
    client = isSupabaseConfigured ? createBrowserClient(url, key) : createStubClient()
    if (!isSupabaseConfigured) {
      console.warn(
        '[ScanSafe] Supabase env vars are missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Auth and database features are disabled.'
      )
    }
  }
  return client
}

// Lazily-initialized client: the real client is only created on first use,
// so missing env vars no longer crash the app at module load time.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getClient()
    const value = Reflect.get(instance, prop, instance)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

// Sign in with Google
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    console.error('Supabase is not configured. Cannot sign in.')
    return
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scansafe-o31d.vercel.app'
  const redirectTo = `${origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo
    }
  })

  if (error) {
    console.error('Login error:', error)
  }
}

// Sign out
export async function signOut() {
  if (!isSupabaseConfigured) return
  await supabase.auth.signOut()
  window.location.href = '/'
}

// Get current user
export async function getUser() {
  if (!isSupabaseConfigured) return null

  const {
    data: { user }
  } = await supabase.auth.getUser()

  return user
}
