
import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createBrowserClient(url, key, {
  cookieOptions: {
    maxAge: 31536000, // 1 year in seconds
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  }
})

// Sign in with Google
export async function signInWithGoogle() {
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

// Sign in with Apple
export async function signInWithApple() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scansafe-o31d.vercel.app'
  const redirectTo = `${origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: redirectTo
    }
  })

  if (error) {
    console.error('Apple Login error:', error)
  }
}

// Sign out
export async function signOut() {
await supabase.auth.signOut()
window.location.href = '/'
}

// Get current user
export async function getUser() {
const {
    data: { user }
} = await supabase.auth.getUser()

return user
}

