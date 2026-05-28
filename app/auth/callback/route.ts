import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      const user = data.user
      
      // Check if user profile already exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()
        
      if (!profile) {
        // Create user profile
        const email = user.email || ''
        const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'User'
        
        await supabase.from('profiles').insert({
          id: user.id,
          email: email,
          full_name: fullName,
          plan: 'free',
          scans_today: 0,
          scans_reset_at: new Date().toISOString().split('T')[0]
        })
      }
    }
  }

  // Redirect to scanner dashboard
  return NextResponse.redirect(new URL('/scan', request.url))
}
