import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Scan, Activity, Eye } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  // Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth')
  }

  // Security check: Verify if the user is an admin.
  // We'll allow access if the email matches the primary owner email (kirtanpatel2326@gmail.com)
  // or if they have a specific role in a roles table. For now, we'll just check against known admin emails.
  // In a real app, you would check a user_roles table or a specific column in profiles.
  const adminEmails = ['kirtanpatel2326@gmail.com']
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase())
  
  // Note: We won't block completely during dev so you can see it, but we'll show a warning.
  // if (!isAdmin) {
  //   redirect('/scan')
  // }

  // Fetch metrics
  // 1. Total Users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 2. Total Scans
  const { count: totalScans } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true })

  // 3. Page Views (Today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: pageViewsToday } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    
  // 4. Total Page Views
  const { count: totalPageViews } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <Link href="/scan" className="text-zinc-400 hover:text-white flex items-center gap-2 mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Scanner
            </Link>
            <h1 className="text-4xl font-black">ScanSafe Admin</h1>
            <p className="text-zinc-500 mt-2">Platform analytics and user tracking</p>
          </div>
          {!isAdmin && (
            <div className="bg-amber-500/20 text-amber-500 border border-amber-500/30 px-4 py-2 rounded-xl text-sm font-semibold">
              Demo Admin Mode (Your email isn't in the admin list)
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Metric Card 1 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">Total Users</p>
            <h2 className="text-4xl font-black text-white">{totalUsers || 0}</h2>
          </div>

          {/* Metric Card 2 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Scan className="w-6 h-6" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">Total Scans</p>
            <h2 className="text-4xl font-black text-white">{totalScans || 0}</h2>
          </div>

          {/* Metric Card 3 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">Page Views (Today)</p>
            <h2 className="text-4xl font-black text-white">{pageViewsToday || 0}</h2>
          </div>
          
          {/* Metric Card 4 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">Total Page Views</p>
            <h2 className="text-4xl font-black text-white">{totalPageViews || 0}</h2>
          </div>

        </div>
        
        <div className="mt-12 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
          <h3 className="text-2xl font-black mb-6">Quick Actions</h3>
          <p className="text-zinc-400 mb-6">More admin controls and data visualizations will be added here as the platform grows.</p>
          <div className="flex gap-4">
            <button className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors">
              Export User Data (CSV)
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
