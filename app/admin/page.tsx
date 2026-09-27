import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminDashboardClient from '@/components/AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin client bypasses RLS
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
            // Can be ignored if called from a Server Component
          }
        },
      },
    }
  )
  
  // Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth')
  }

  // Security check: Verify if the user is an admin.
  const adminEmails = ['kirtanpatel2326@gmail.com']
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase())
  
  // Load initial datasets using service role client
  const { data: usersList } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: scansList } = await supabase
    .from('scans')
    .select('id, user_id, product_name, health_score, safety_level, created_at, profiles(email)')
    .order('created_at', { ascending: false })

  const { data: pageViewsList } = await supabase
    .from('page_views')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: pendingPaymentsList } = await supabase
    .from('pending_payments')
    .select('*, profiles(email)')
    .order('created_at', { ascending: false })

  const { data: blacklistList } = await supabase
    .from('blacklist')
    .select('*')

  return (
    <AdminDashboardClient
      initialUsers={usersList || []}
      initialScans={scansList || []}
      initialPageViews={pageViewsList || []}
      initialPendingPayments={pendingPaymentsList || []}
      initialBlacklist={blacklistList || []}
      isAdmin={!!isAdmin}
    />
  )
}
