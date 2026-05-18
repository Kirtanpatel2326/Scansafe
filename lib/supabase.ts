import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Client-side Supabase (for components)
export const supabase = createClientComponentClient()

// Sign in with Google
export async function signInWithGoogle() {
const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
    redirectTo: `${window.location.origin}/auth/callback`
    }
})
if (error) console.error('Login error:', error)
}

// Sign out
export async function signOut() {
await supabase.auth.signOut()
window.location.href = '/'
}

// Get current user
export async function getUser() {
const { data: { user } } = await supabase.auth.getUser()
return user
}