import { createClient, createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    // Check if profile exists
    const { data: profile, error: fetchError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      const email = user.email || ''
      const fullName = user.user_metadata?.full_name || email.split('@')[0] || 'User'
      
      const { error: insertError } = await adminClient.from('profiles').insert({
        id: user.id,
        email: email,
        full_name: fullName,
        plan: 'free',
        scans_today: 0,
        scans_reset_at: new Date().toISOString().split('T')[0]
      })

      if (insertError) {
        console.error('Error inserting profile:', insertError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Profile ensure error:', err)
    return NextResponse.json({ error: 'Failed to synchronize user profile. Please try again later.' }, { status: 500 })
  }
}
