import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: 31536000, // 1 year in seconds
        secure: true,
        sameSite: 'lax',
        path: '/'
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-browser cookies.
  const { data: { user } } = await supabase.auth.getUser()

  // Auto-detect browser language if not set
  const existingCookie = request.cookies.get('preferred_lang')?.value
  if (!existingCookie) {
    const acceptLanguage = request.headers.get('accept-language') || ''
    const browserLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase()
    const supportedLangs = ['en', 'hi', 'gu', 'te', 'ta', 'kn', 'mr', 'bn']
    const lang = supportedLangs.includes(browserLang) ? browserLang : 'en'
    
    supabaseResponse.cookies.set('preferred_lang', lang, {
      maxAge: 31536000,
      path: '/'
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
