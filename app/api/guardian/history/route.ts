import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { checkGuardianRateLimitShared } from '@/lib/guardian-security'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let db: Awaited<ReturnType<typeof createClient>>
  try {
    db = await createClient()
  } catch (err: any) {
    console.error('[Guardian Task History Database Init Error]', err)
    return NextResponse.json({ error: 'Database context unavailable' }, { status: 503 })
  }

  const { data: { user } } = await db.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to access saved task history' }, { status: 401 })
  }

  const rateLimitResponse = await checkGuardianRateLimitShared(request, user.id, {
    routeLabel: 'guardian-task-history',
    maxRequests: 30
  })
  if (rateLimitResponse) return rateLimitResponse

  const { data, error } = await db
    .from('guardian_saved_tasks')
    .select('run_id,goal,shortlist,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[Guardian Task History Query Error]', { userId: user.id, message: error.message, code: error.code })
    return NextResponse.json(
      { error: 'History unavailable; ensure schema_guardian.sql migration is applied.' },
      { status: 503 }
    )
  }

  return NextResponse.json({ tasks: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
}
