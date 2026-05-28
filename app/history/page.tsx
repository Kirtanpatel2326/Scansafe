'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ResultCard from '@/components/ResultCard'
import NutritionTable from '@/components/NutritionTable'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { History, Search, ArrowLeft, ShieldCheck, ShieldAlert, Shield, Calendar, RefreshCw, ChevronRight } from 'lucide-react'

interface ScanRecord {
  id: string
  user_id: string
  product_name: string
  barcode?: string
  health_score: number
  safety_level: 'safe' | 'moderate' | 'danger'
  result_json: any
  created_at: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<ScanRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSafety, setFilterSafety] = useState<string>('all')
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/auth')
      } else {
        setUser(user)
        // Ensure profile exists
        await fetch('/api/profile/ensure', { method: 'POST' })
        fetchScans(user.id)
      }
    })
  }, [router])

  const fetchScans = async (userId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setScans(data as ScanRecord[])
      }
    } catch (err) {
      console.error('Error fetching scan history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter logic
  const filteredScans = scans.filter((scan) => {
    const matchesSearch = scan.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSafety = filterSafety === 'all' || scan.safety_level === filterSafety
    return matchesSearch && matchesSafety
  })

  // Format date utility
  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSafetyBadge = (level: string) => {
    switch (level) {
      case 'safe':
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"><ShieldCheck className="w-3 h-3" /> Safe</span>
      case 'moderate':
        return <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"><Shield className="w-3 h-3" /> Caution</span>
      case 'danger':
        return <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"><ShieldAlert className="w-3 h-3" /> Risk</span>
      default:
        return null
    }
  }

  if (loading && scans.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-zinc-500 text-sm mt-3">Loading your scan archives...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {selectedScan ? (
          /* Detailed past scan view */
          <div className="flex flex-col gap-6">
            {/* Header control */}
            <div className="flex justify-between items-center bg-zinc-950/40 border border-zinc-850 rounded-xl p-4">
              <button
                onClick={() => setSelectedScan(null)}
                className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Scan History
              </button>
              
              <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4" /> Analyzed on {formatDate(selectedScan.created_at)}
              </div>
            </div>

            {/* Results Grid layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-[2] w-full">
                <ResultCard result={selectedScan.result_json} />
              </div>
              
              {selectedScan.result_json.nutrition_facts && Object.keys(selectedScan.result_json.nutrition_facts).length > 0 && (
                <div className="flex-1 w-full lg:sticky lg:top-24">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">Nutrition Panel</h3>
                  <NutritionTable nutrition={selectedScan.result_json.nutrition_facts} />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Scans list view */
          <div>
            {/* Header banner */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-zinc-900">
              <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-2">
                  Scan History <History className="w-6 h-6 text-emerald-400" />
                </h1>
                <p className="text-zinc-400 text-sm mt-1">
                  Re-examine all processed food products from your shopper history.
                </p>
              </div>
            </div>

            {scans.length === 0 ? (
              /* Empty state */
              <div className="text-center py-20 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/10">
                <History className="w-12 h-12 text-zinc-650 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-1.5">No Scans Recorded</h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
                  You haven't scanned any ingredient labels yet. Snap a picture to get started!
                </p>
                <button
                  onClick={() => router.push('/scan')}
                  className="rounded-full bg-emerald-500 text-black px-6 py-2.5 font-bold hover:bg-emerald-400 transition"
                >
                  Scan a Product
                </button>
              </div>
            ) : (
              /* Browser & list table */
              <div className="flex flex-col gap-6">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-950/50 border border-zinc-850 p-4 rounded-xl">
                  {/* Search box */}
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search scanned products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  {/* Safety filters */}
                  <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
                    <span className="text-xs text-zinc-550 font-bold uppercase tracking-wider shrink-0 mr-1.5">Filter:</span>
                    {['all', 'safe', 'moderate', 'danger'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setFilterSafety(level)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border uppercase tracking-wider transition ${
                          filterSafety === level
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                            : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List Grid */}
                <div className="grid gap-3">
                  {filteredScans.length > 0 ? (
                    filteredScans.map((scan) => (
                      <div
                        key={scan.id}
                        onClick={() => setSelectedScan(scan)}
                        className="flex items-center justify-between border border-zinc-850 bg-zinc-900/10 rounded-xl p-4 cursor-pointer hover:bg-zinc-900/40 hover:border-zinc-700 transition"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Score Badge */}
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                            scan.health_score >= 70
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                              : scan.health_score >= 40
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                          }`}>
                            {scan.health_score}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-white truncate text-sm sm:text-base leading-snug">
                              {scan.product_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5 text-zinc-500 text-xs">
                              <span className="truncate">{formatDate(scan.created_at)}</span>
                              {scan.barcode && (
                                <>
                                  <div className="w-[3px] h-[3px] rounded-full bg-zinc-800" />
                                  <span>Barcode: {scan.barcode}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Safety Status & Arrow */}
                        <div className="flex items-center gap-4 shrink-0 pl-2">
                          <div className="hidden sm:inline-block">
                            {getSafetyBadge(scan.safety_level)}
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-600" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-550 text-center py-10 text-sm">No matches found for active search filter.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
