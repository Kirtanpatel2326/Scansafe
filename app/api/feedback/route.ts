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

    const body = await req.json().catch(() => ({}))
    const { scanId, rating, comment } = body
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. You must be signed in to submit feedback.' }, { status: 401 })
    }

    const numericRating = Number(rating)
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5.' }, { status: 400 })
    }

    // Verify scan ownership if scanId is provided
    if (scanId) {
      const { data: scan, error: scanErr } = await supabase
        .from('scans')
        .select('id')
        .eq('id', scanId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (scanErr || !scan) {
        return NextResponse.json({ error: 'Scan record not found or does not belong to your account.' }, { status: 404 })
      }
    }

    // Insert feedback
    const sanitizedComment = typeof comment === 'string' ? comment.trim().slice(0, 2000) : ''

    const { error } = await supabase
      .from('scan_feedback')
      .insert({
        user_id: user.id,
        scan_id: scanId || null,
        rating: numericRating,
        comment: sanitizedComment
      })

    if (error) {
      console.error('Feedback insertion error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
