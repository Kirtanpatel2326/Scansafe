import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Can be ignored
            }
          },
        },
      }
    )

    const { scanId, rating, comment } = await req.json()
    const { data: { user } } = await supabase.auth.getUser()

    // Insert feedback
    const { error } = await supabase
      .from('scan_feedback')
      .insert({
        user_id: user?.id || null,
        scan_id: scanId || null,
        rating: Number(rating),
        comment: comment || ''
      })

    if (error) {
      console.error('Feedback insertion error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
