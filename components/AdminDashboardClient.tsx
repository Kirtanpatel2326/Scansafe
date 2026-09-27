'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Users, 
  Scan, 
  Activity, 
  Eye, 
  Crown, 
  Calendar, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  ShieldAlert,
  Search,
  Zap,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  Tag
} from 'lucide-react'

interface AdminDashboardClientProps {
  initialUsers: any[]
  initialScans: any[]
  initialPageViews: any[]
  initialPendingPayments: any[]
  initialBlacklist: any[]
  isAdmin: boolean
}

export default function AdminDashboardClient({
  initialUsers,
  initialScans,
  initialPageViews,
  initialPendingPayments,
  initialBlacklist,
  isAdmin
}: AdminDashboardClientProps) {
  // Filters & State
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null)

  // 1. Date filter function
  const filterByDate = (items: any[], dateField: string) => {
    if (dateRange === 'all') return items
    const now = new Date()
    let limitMs = 0
    if (dateRange === '24h') limitMs = 24 * 60 * 60 * 1000
    else if (dateRange === '7d') limitMs = 7 * 24 * 60 * 60 * 1000
    else if (dateRange === '30d') limitMs = 30 * 24 * 60 * 60 * 1000
    
    const cutOff = now.getTime() - limitMs
    return items.filter(item => new Date(item[dateField]).getTime() >= cutOff)
  }

  // Exclude system admin accounts from organic customer statistics
  const adminEmails = ['kirtanpatel2326@gmail.com', 'kirtanpatel2305@gmail.com']
  const adminUserIds = new Set(
    initialUsers
      .filter(u => adminEmails.includes(u.email?.toLowerCase()))
      .map(u => u.id)
  )

  const realUsers = initialUsers.filter(u => !adminEmails.includes(u.email?.toLowerCase()))
  const realScans = initialScans.filter(s => !adminUserIds.has(s.user_id) && !adminEmails.includes(s.profiles?.email?.toLowerCase()))
  const realPendingPayments = initialPendingPayments.filter(p => !adminUserIds.has(p.user_id) && !adminEmails.includes(p.profiles?.email?.toLowerCase()))
  const realPageViews = initialPageViews.filter(v => !adminUserIds.has(v.user_id))

  // Filtered lists
  const filteredPageViews = filterByDate(realPageViews, 'created_at')
  const filteredScans = filterByDate(realScans, 'created_at')
  const filteredUsers = filterByDate(realUsers, 'created_at')

  // Search filter on users list
  const searchedUsersList = filteredUsers.filter(usr => 
    usr.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Metrics Calculations
  const totalUsersCount = realUsers.length
  const proUsersCount = realUsers.filter(u => u.plan === 'pro').length
  const freeUsersCount = realUsers.filter(u => u.plan === 'free').length

  const filteredUniques = new Set(filteredPageViews.map(v => v.ip_hash).filter(Boolean)).size
  const filteredProCount = filteredUsers.filter(u => u.plan === 'pro').length

  // Active users count in filtered period (users who loaded the page or performed a scan)
  const activeUsersCount = new Set([
    ...filteredScans.map(s => s.user_id).filter(Boolean),
    ...filteredPageViews.map(v => v.ip_hash).filter(Boolean) // Page views proxy for guest activity
  ]).size

  // Payer calculations (who is paying us the most & total amounts)
  const paymentTotalsByUser: Record<string, { email: string; totalAmount: number }> = {}
  realPendingPayments.forEach(p => {
    if (p.status === 'approved') {
      const email = p.profiles?.email || 'Unknown Payer'
      const userId = p.user_id
      const amount = Number(p.amount) || 0
      
      if (!paymentTotalsByUser[userId]) {
        paymentTotalsByUser[userId] = { email, totalAmount: 0 }
      }
      paymentTotalsByUser[userId].totalAmount += amount
    }
  })
  
  const sortedPayers = Object.values(paymentTotalsByUser).sort((a, b) => b.totalAmount - a.totalAmount)
  const highestPayer = sortedPayers[0] || null // { email, totalAmount }

  // Today metrics
  const startOfTodayVal = new Date()
  startOfTodayVal.setHours(0, 0, 0, 0)
  const registeredToday = realUsers.filter(u => new Date(u.created_at).getTime() >= startOfTodayVal.getTime()).length
  const purchasesToday = realPendingPayments.filter(p => 
    p.status === 'approved' && 
    new Date(p.created_at).getTime() >= startOfTodayVal.getTime()
  ).length
  
  // 2. Generate daily traffic data for chart
  const getDailyTraffic = () => {
    const daysToGenerate = dateRange === '24h' ? 24 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 15
    const trafficMap: Record<string, number> = {}
    
    // Initialize map
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date()
      if (dateRange === '24h') {
        d.setHours(d.getHours() - i)
        const hourStr = d.toLocaleTimeString(undefined, { hour: '2-digit', hour12: false }) + ':00'
        trafficMap[hourStr] = 0
      } else {
        d.setDate(d.getDate() - i)
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        trafficMap[dateStr] = 0
      }
    }

    // Populate counts
    filteredPageViews.forEach(view => {
      const d = new Date(view.created_at)
      if (dateRange === '24h') {
        const hourStr = d.toLocaleTimeString(undefined, { hour: '2-digit', hour12: false }) + ':00'
        if (hourStr in trafficMap) trafficMap[hourStr]++
      } else {
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        if (dateStr in trafficMap) trafficMap[dateStr]++
      }
    })

    return Object.entries(trafficMap).map(([label, value]) => ({ label, value }))
  }

  const trafficData = getDailyTraffic()
  const maxTrafficVal = Math.max(1, ...trafficData.map(d => d.value))

  // 3. Safety Distribution Counts
  const safetyStats = { safe: 0, moderate: 0, danger: 0 }
  filteredScans.forEach(s => {
    if (s.safety_level === 'safe') safetyStats.safe++
    else if (s.safety_level === 'moderate') safetyStats.moderate++
    else if (s.safety_level === 'danger') safetyStats.danger++
  })
  const totalScansInPeriod = filteredScans.length || 1

  // 4. Product Insights: Top Scanned Products
  const topProductsMap: Record<string, number> = {}
  realScans.forEach(s => {
    const name = s.product_name?.trim() || 'Unknown Item'
    topProductsMap[name] = (topProductsMap[name] || 0) + 1
  })
  const topProducts = Object.entries(topProductsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 5. Product Insights: Most Blacklisted Ingredients
  const topBlacklistsMap: Record<string, number> = {}
  initialBlacklist.forEach(b => {
    const ing = b.ingredient?.trim().toLowerCase()
    if (ing) {
      topBlacklistsMap[ing] = (topBlacklistsMap[ing] || 0) + 1
    }
  })
  const topBlacklists = Object.entries(topBlacklistsMap)
    .map(([ingredient, count]) => ({ ingredient, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // 6. Common Allergens
  const topAllergensMap: Record<string, number> = {}
  realUsers.forEach(u => {
    const allergies = u.dietary_profile?.allergies || []
    allergies.forEach((alg: string) => {
      const name = alg.trim().toLowerCase()
      topAllergensMap[name] = (topAllergensMap[name] || 0) + 1
    })
  })
  const topAllergens = Object.entries(topAllergensMap)
    .map(([allergy, count]) => ({ allergy, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Manual payment actions
  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'reject') => {
    if (!isAdmin) {
      alert('Action not allowed in Demo Mode.')
      return
    }
    
    if (processingPaymentId) return
    setProcessingPaymentId(paymentId)

    try {
      const res = await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action })
      })
      const data = await res.json()
      if (data.success) {
        alert(`Payment successfully ${action === 'approve' ? 'approved & upgraded user' : 'rejected'}`)
        window.location.reload()
      } else {
        alert(data.error || 'Failed to update payment status')
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred.')
    } finally {
      setProcessingPaymentId(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-emerald-500 selection:text-black">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <Link href="/scan" className="text-zinc-400 hover:text-white flex items-center gap-2 mb-4 transition-colors text-sm font-semibold">
              <ArrowLeft className="w-4 h-4" /> Back to Scanner
            </Link>
            <h1 className="text-4xl font-black text-white flex items-center gap-2.5">
              ScanSafe Dashboard <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">Data Analyst Mode</span>
            </h1>
            <p className="text-zinc-500 mt-2 text-sm leading-relaxed">Platform performance metrics, deep ingredient analytics, and UPI payment audits.</p>
          </div>

          {/* Time Filter Controls */}
          <div className="flex bg-zinc-950 border border-zinc-900 rounded-2xl p-1 shrink-0 self-start md:self-auto shadow-inner">
            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  dateRange === range
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-zinc-450 hover:text-white'
                }`}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </header>

        {!isAdmin && (
          <div className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-3 mb-8">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <strong className="block text-amber-200">Demo Mode Active</strong>
              Your current account doesn't have official write authorization, but you can preview all platform charts & log tables.
            </div>
          </div>
        )}

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1 */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-800 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">Unique Traffic</p>
            <h2 className="text-3xl font-black text-white">{filteredUniques}</h2>
            <p className="text-zinc-650 text-[10px] mt-2">From {filteredPageViews.length} total hits in range</p>
          </div>

          {/* Card 2 */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-800 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">Sign Ins</p>
            <h2 className="text-3xl font-black text-white">{filteredUsers.length}</h2>
            <p className="text-zinc-650 text-[10px] mt-2">Today: <strong className="text-emerald-400 font-bold">+{registeredToday}</strong> | Total accounts: {totalUsersCount}</p>
          </div>

          {/* Card 3 */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-800 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">Conversion (PRO)</p>
            <h2 className="text-3xl font-black text-amber-400">{filteredProCount}</h2>
            <p className="text-zinc-650 text-[10px] mt-2">Today: <strong className="text-amber-450 font-bold">+{purchasesToday} bought</strong> | Total: {proUsersCount}</p>
          </div>

          {/* Card 4 */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 hover:border-zinc-800 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <Scan className="w-5 h-5" />
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">Product Audits</p>
            <h2 className="text-3xl font-black text-white">{filteredScans.length}</h2>
            <p className="text-zinc-650 text-[10px] mt-2">Total scans: {initialScans.length}</p>
          </div>
        </div>

        {/* CUSTOMER VALUE & REVENUE ANALYTICS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Active Users/Customers Card */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 relative overflow-hidden">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">Active Customers</p>
            <h3 className="text-2xl font-black text-white">{activeUsersCount}</h3>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Total distinct accounts and visitors interacting with scanner controls in this date filter.
            </p>
          </div>

          {/* Paying Users Card */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 relative overflow-hidden">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">Paying Customers</p>
            <h3 className="text-2xl font-black text-amber-400">
              {proUsersCount} <span className="text-zinc-500 text-xs font-medium">({((proUsersCount / Math.max(1, totalUsersCount)) * 100).toFixed(1)}%)</span>
            </h3>
            <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
              Users on active PRO tiers out of {totalUsersCount} registered accounts.
            </p>
          </div>

          {/* Highest Payer Card */}
          <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 relative overflow-hidden">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">Highest Value Customer</p>
            {highestPayer ? (
              <>
                <h3 className="text-2xl font-black text-emerald-400">₹{highestPayer.totalAmount}</h3>
                <p className="text-zinc-350 text-xs mt-1.5 truncate" title={highestPayer.email}>
                  Payer: <strong className="text-white select-all font-mono">{highestPayer.email}</strong>
                </p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black text-zinc-500">₹0</h3>
                <p className="text-zinc-400 text-xs mt-1.5">No approved payments recorded.</p>
              </>
            )}
          </div>
        </div>

        {/* CHARTS CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Daily Web Traffic Bar Chart */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Daily Web traffic Trend
              </h3>
              <span className="text-[10px] text-zinc-550 italic">Capped values relative to peak</span>
            </div>

            {/* Custom Flexbox Bar Chart */}
            <div className="flex items-end justify-between h-[180px] pt-6 pb-2 border-b border-zinc-900/60 relative">
              {/* Chart Grid Lines */}
              <div className="absolute inset-x-0 top-6 border-t border-zinc-900/30 w-full" />
              <div className="absolute inset-x-0 top-1/2 border-t border-zinc-900/30 w-full" />
              
              {trafficData.map((data, idx) => {
                const heightPct = Math.max(6, (data.value / maxTrafficVal) * 100)
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end px-0.5">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none z-10 whitespace-nowrap">
                      {data.value} views
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full bg-gradient-to-t from-emerald-600/60 to-emerald-400 rounded-t-sm transition-all duration-700 group-hover:brightness-110"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                )
              })}
            </div>
            
            {/* Chart Labels */}
            <div className="flex justify-between text-[8px] text-zinc-500 font-bold uppercase tracking-wider mt-2.5 px-1">
              <span>{trafficData[0]?.label}</span>
              <span>{trafficData[Math.floor(trafficData.length / 2)]?.label}</span>
              <span>{trafficData[trafficData.length - 1]?.label}</span>
            </div>
          </div>

          {/* Safety Verdict Distribution Segmented Bar */}
          <div className="lg:col-span-1 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-6">
                <ShieldAlert className="w-4 h-4 text-purple-400" /> Food Safety Ratios
              </h3>
              
              <div className="flex flex-col gap-4">
                {/* Segmented bar visual */}
                <div className="w-full bg-zinc-900 rounded-full h-3 flex overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-1000" 
                    style={{ width: `${(safetyStats.safe / totalScansInPeriod) * 100}%` }}
                  />
                  <div 
                    className="bg-amber-400 h-full transition-all duration-1000" 
                    style={{ width: `${(safetyStats.moderate / totalScansInPeriod) * 100}%` }}
                  />
                  <div 
                    className="bg-rose-500 h-full transition-all duration-1000" 
                    style={{ width: `${(safetyStats.danger / totalScansInPeriod) * 100}%` }}
                  />
                </div>

                {/* Legend list */}
                <div className="flex flex-col gap-2.5 mt-2">
                  <div className="flex justify-between text-xs font-semibold items-center">
                    <span className="flex items-center gap-2 text-emerald-400"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /> Safe & Clean</span>
                    <span>{safetyStats.safe} ({((safetyStats.safe / totalScansInPeriod) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold items-center">
                    <span className="flex items-center gap-2 text-amber-400"><div className="w-2.5 h-2.5 rounded bg-amber-400" /> Caution</span>
                    <span>{safetyStats.moderate} ({((safetyStats.moderate / totalScansInPeriod) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold items-center">
                    <span className="flex items-center gap-2 text-rose-400"><div className="w-2.5 h-2.5 rounded bg-rose-500" /> High Risk</span>
                    <span>{safetyStats.danger} ({((safetyStats.danger / totalScansInPeriod) * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-zinc-550 leading-relaxed mt-6 pt-4 border-t border-zinc-900">
              Breakdown of chemicals, emulsifiers, and carcinogenic elements audited inside range.
            </p>
          </div>

        </div>

        {/* UPI PAYMENTS CONSOLE */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" /> UPI Manual Payment Approvals Console
            </h3>
            <span className="bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 px-3 py-1 rounded-full">
              {initialPendingPayments.filter(p => p.status === 'pending').length} pending requests
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-black tracking-wider">
                  <th className="pb-3 pr-2">User Email</th>
                  <th className="pb-3 px-2">UTR Reference</th>
                  <th className="pb-3 px-2">Plan Type</th>
                  <th className="pb-3 px-2 text-center">Amount</th>
                  <th className="pb-3 px-2 text-center">Status</th>
                  <th className="pb-3 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialPendingPayments && initialPendingPayments.length > 0 ? (
                  initialPendingPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 transition">
                      <td className="py-4 pr-2 font-medium text-zinc-200">{payment.profiles?.email || 'Unknown User'}</td>
                      <td className="py-4 px-2 font-mono text-zinc-400 select-all">{payment.utr}</td>
                      <td className="py-4 px-2 uppercase font-bold text-zinc-350">{payment.plan_type}</td>
                      <td className="py-4 px-2 text-center font-black text-white">₹{payment.amount}</td>
                      <td className="py-4 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          payment.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : payment.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-4 pl-2 text-right">
                        {payment.status === 'pending' ? (
                          <div className="inline-flex gap-2">
                            <button
                              disabled={processingPaymentId !== null}
                              onClick={() => handlePaymentAction(payment.id, 'approve')}
                              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition text-[10px]"
                            >
                              <Check className="w-3 h-3 stroke-[3]" /> Approve
                            </button>
                            <button
                              disabled={processingPaymentId !== null}
                              onClick={() => handlePaymentAction(payment.id, 'reject')}
                              className="bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition text-[10px]"
                            >
                              <X className="w-3 h-3 stroke-[3]" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">Audited</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 italic">
                      No UPI verification requests found in log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOD METRICS & INSIGHTS CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Top Scanned Products */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-6">
              <Scan className="w-4 h-4 text-emerald-400" /> Top Scanned Foods
            </h3>
            <div className="flex flex-col gap-3">
              {topProducts.length > 0 ? (
                topProducts.map((p, index) => (
                  <div key={index} className="flex justify-between items-center bg-zinc-900/20 border border-zinc-900/50 p-3 rounded-xl">
                    <span className="text-xs font-semibold text-zinc-300 truncate max-w-[180px]">{p.name}</span>
                    <span className="text-[10px] font-black bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{p.count} scans</span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-550 italic text-xs py-4 text-center">No scans recorded.</p>
              )}
            </div>
          </div>

          {/* Top Blacklisted Ingredients */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 text-rose-400" /> Most Blacklisted
            </h3>
            <div className="flex flex-col gap-3">
              {topBlacklists.length > 0 ? (
                topBlacklists.map((b, index) => (
                  <div key={index} className="flex justify-between items-center bg-zinc-900/20 border border-zinc-900/50 p-3 rounded-xl">
                    <span className="text-xs font-semibold text-zinc-300 capitalize">{b.ingredient}</span>
                    <span className="text-[10px] font-black bg-zinc-900 border border-zinc-800 text-rose-400 px-2 py-0.5 rounded-full">{b.count} avoids</span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-550 italic text-xs py-4 text-center">No blacklisted items found.</p>
              )}
            </div>
          </div>

          {/* Allergen Concerns */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 mb-6">
              <Tag className="w-4 h-4 text-blue-400" /> Common Allergies
            </h3>
            <div className="flex flex-col gap-3">
              {topAllergens.length > 0 ? (
                topAllergens.map((a, index) => (
                  <div key={index} className="flex justify-between items-center bg-zinc-900/20 border border-zinc-900/50 p-3 rounded-xl">
                    <span className="text-xs font-semibold text-zinc-300 capitalize">{a.allergy}</span>
                    <span className="text-[10px] font-black bg-zinc-900 border border-zinc-800 text-blue-400 px-2 py-0.5 rounded-full">{a.count} profiles</span>
                  </div>
                ))
              ) : (
                <p className="text-zinc-550 italic text-xs py-4 text-center">No user allergy profiles logged.</p>
              )}
            </div>
          </div>

        </div>

        {/* LOG TABLES */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Users List Column */}
          <div className="lg:col-span-3 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Registered Users ({searchedUsersList.length})
              </h3>
              {/* User search bar */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-black tracking-wider">
                    <th className="pb-3 pr-2">User Email</th>
                    <th className="pb-3 px-2">Plan</th>
                    <th className="pb-3 px-2 text-center">Scans Used</th>
                    <th className="pb-3 pl-2 text-right">Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedUsersList.length > 0 ? (
                    searchedUsersList.map((usr) => (
                      <tr key={usr.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 transition">
                        <td className="py-3.5 pr-2 font-medium text-zinc-350 truncate max-w-[180px]" title={usr.email}>
                          {usr.email}
                        </td>
                        <td className="py-3.5 px-2">
                          {usr.plan === 'pro' ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] inline-flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 fill-amber-400" /> PRO
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]">
                              FREE
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-white">
                          {usr.scans_today || 0} {usr.plan === 'pro' ? ' / ∞' : ' / 5'}
                        </td>
                        <td className="py-3.5 pl-2 text-right text-zinc-500">
                          {new Date(usr.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500 italic">
                        No registered users found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Audits Log Column */}
          <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <Scan className="w-5 h-5 text-purple-400" /> Live Audit Log ({filteredScans.length})
            </h3>
            
            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-1">
              {filteredScans.length > 0 ? (
                filteredScans.map((scn: any) => (
                  <div key={scn.id} className="bg-zinc-900/20 border border-zinc-900/60 p-4 rounded-2xl flex flex-col gap-2 hover:border-zinc-800 transition text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <strong className="font-bold text-zinc-200 truncate pr-2" title={scn.product_name}>
                        {scn.product_name}
                      </strong>
                      <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        scn.safety_level === 'safe'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : scn.safety_level === 'moderate'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        Score: {scn.health_score}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-550 pt-1 border-t border-zinc-900/40">
                      <span className="truncate max-w-[150px] italic">By: {scn.profiles?.email || 'Unknown User'}</span>
                      <span>{new Date(scn.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-550 italic py-8 text-center">No scans recorded in selected range.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
