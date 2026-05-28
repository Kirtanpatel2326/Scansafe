
import { createBrowserClient } from '@supabase/ssr'

// Create Supabase client
export const supabase = createBrowserClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Sign in with Google
export async function signInWithGoogle() {
const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
    redirectTo: 'http://localhost:3000/auth/callback'

    }
})

if (error) {
    console.error('Login error:', error)
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

