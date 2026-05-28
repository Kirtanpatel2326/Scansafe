
import { createBrowserClient } from '@supabase/ssr'

let supabaseClient;
try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (typeof window !== 'undefined' && (!url || !key)) {
    alert(`Configuration Error on Vercel:\nNEXT_PUBLIC_SUPABASE_URL: ${url ? 'Loaded ✅' : 'MISSING ❌'}\nNEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? 'Loaded ✅' : 'MISSING ❌'}\n\nPlease check your Vercel Environment Variables!`);
  }
  
  supabaseClient = createBrowserClient(url || '', key || '');
} catch (e) {
  console.error('Failed to create Supabase client:', e);
}

export const supabase = supabaseClient;

// Sign in with Google
export async function signInWithGoogle() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scansafe-o31d.vercel.app'
  const redirectTo = `${origin}/auth/callback`
  
  if (typeof window !== 'undefined') {
    alert(`Debug Info:\nOrigin: ${origin}\nRedirect Target: ${redirectTo}`);
  }

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

