'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ResultCard from '@/components/ResultCard'
import NutritionTable from '@/components/NutritionTable'
import OnboardingChecklist from '@/components/OnboardingChecklist'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { History, Search, ArrowLeft, ShieldCheck, ShieldAlert, Shield, Calendar, RefreshCw, ChevronRight, Trash2 } from 'lucide-react'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedScanIds, setSelectedScanIds] = useState<Set<string>>(new Set())
  const [historyImageUrl, setHistoryImageUrl] = useState<string | null>(null)

  useEffect(() => {
    // 1. Check active session (retrieves cached session and handles background refreshes)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      if (currentUser) {
        setUser(currentUser)
        await fetch('/api/profile/ensure', { method: 'POST' })
        fetchScans(currentUser.id)
      } else {
        router.push('/auth')
        setLoading(false)
      }
    })

    // 2. Listen for auth changes (token refreshes, sign ins, sign outs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (!currentUser) {
        router.push('/auth')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (selectedScan) {
      if (selectedScan.result_json.image_url) {
        setHistoryImageUrl(selectedScan.result_json.image_url)
      } else if (selectedScan.barcode) {
        // Fetch from Open Food Facts API dynamically
        fetch(`https://world.openfoodfacts.org/api/v3/product/${selectedScan.barcode}.json`)
          .then(res => res.json())
          .then(data => {
            const img = data.product?.image_url || data.product?.image_front_url || data.product?.image_front_small_url || null
            setHistoryImageUrl(img)
          })
          .catch(() => setHistoryImageUrl(null))
      } else {
        setHistoryImageUrl(null)
      }
    } else {
      setHistoryImageUrl(null)
    }
  }, [selectedScan])

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

  const handleDeleteScan = async (scanId: string) => {
    if (!window.confirm('Are you sure you want to delete this scan from your history?')) {
      return
    }

    setDeletingId(scanId)
    try {
      const { error } = await supabase
        .from('scans')
        .delete()
        .eq('id', scanId)

      if (error) throw error

      // Update local state
      setScans(prev => prev.filter(s => s.id !== scanId))
      setSelectedScan(null)
    } catch (err: any) {
      console.error('Error deleting scan:', err)
      alert(err.message || 'Failed to delete scan. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => !prev)
    setSelectedScanIds(new Set())
  }

  const toggleSelectScan = (scanId: string) => {
    setSelectedScanIds((prev) => {
      const next = new Set(prev)
      if (next.has(scanId)) {
        next.delete(scanId)
      } else {
        next.add(scanId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedScanIds.size === filteredScans.length) {
      setSelectedScanIds(new Set())
    } else {
      setSelectedScanIds(new Set(filteredScans.map(s => s.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedScanIds.size === 0) return

    if (!window.confirm(`Are you sure you want to delete the ${selectedScanIds.size} selected scans from your history?`)) {
      return
    }

    setLoading(true)
    try {
      const idsToDelete = Array.from(selectedScanIds)
      const { error } = await supabase
        .from('scans')
        .delete()
        .in('id', idsToDelete)

      if (error) throw error

      setScans(prev => prev.filter(s => !selectedScanIds.has(s.id)))
      setSelectedScanIds(new Set())
      setIsSelectionMode(false)
    } catch (err: any) {
      console.error('Error during bulk delete:', err)
      alert(err.message || 'Failed to delete selected scans.')
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
            <div className="flex justify-between items-center bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex-wrap gap-4">
              <button
                onClick={() => setSelectedScan(null)}
                className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Scan History
              </button>
              
              <div className="flex items-center gap-4">
                <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4" /> Analyzed on {formatDate(selectedScan.created_at)}
                </div>
                <button
                  onClick={() => handleDeleteScan(selectedScan.id)}
                  disabled={deletingId === selectedScan.id}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 disabled:opacity-50 transition border border-rose-950/30 hover:border-rose-900/50 bg-rose-950/10 px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deletingId === selectedScan.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Results Grid layout */}
            {selectedScan.barcode?.startsWith('COMPARE:') ? (
              <div className="flex flex-col gap-8 w-full">
                {/* Winner Card */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
                  <div className="mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      🏆 WINNER VERDICT: {selectedScan.result_json.winner === 'tie' ? 'TIE' : `PRODUCT ${selectedScan.result_json.winner}`}
                    </span>
                    <h3 className="text-xl md:text-2xl font-black text-white mt-3">
                      {selectedScan.result_json.winner === 'A' 
                        ? `${selectedScan.result_json.product_a.brand} ${selectedScan.result_json.product_a.name}`
                        : selectedScan.result_json.winner === 'B'
                        ? `${selectedScan.result_json.product_b.brand} ${selectedScan.result_json.product_b.name}`
                        : 'It is a Healthy Tie!'}
                    </h3>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2">Personalized Health Rationale</p>
                    <p className="text-zinc-200 text-sm leading-relaxed font-medium select-text">
                      {selectedScan.result_json.winner_reason}
                    </p>
                  </div>
                </div>

                {/* Side-by-Side Detail Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product A Card */}
                  <div className={`bg-zinc-950 border rounded-3xl p-6 relative overflow-hidden transition ${
                    selectedScan.result_json.winner === 'A' ? 'border-emerald-500/30' : 'border-zinc-900'
                  }`}>
                    {selectedScan.result_json.winner === 'A' && (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Winner 🏆
                      </div>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Product A</span>
                    <h4 className="text-lg font-black text-white mt-1.5">{selectedScan.result_json.product_a.brand}</h4>
                    <p className="text-zinc-450 text-xs truncate mb-5">{selectedScan.result_json.product_a.name}</p>

                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border font-black ${
                        selectedScan.result_json.product_a.safety_level === 'safe'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : selectedScan.result_json.product_a.safety_level === 'moderate'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        <span className="text-[8px] uppercase font-bold leading-none mb-1 text-zinc-500">Score</span>
                        <span className="text-xl leading-none">{selectedScan.result_json.product_a.health_score}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider block text-zinc-500 mb-1">Safety Level</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                          selectedScan.result_json.product_a.safety_level === 'safe'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : selectedScan.result_json.product_a.safety_level === 'moderate'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {selectedScan.result_json.product_a.safety_level}
                        </span>
                      </div>
                    </div>

                    <div className="h-[1px] bg-zinc-900 my-4" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-2">Highlights</p>
                    <ul className="space-y-1.5">
                      {selectedScan.result_json.product_a.highlights?.map((h: any, i: number) => (
                        <li key={i} className="text-xs text-zinc-350 flex items-start gap-2 select-text">
                          <div className="w-1.5 h-1.5 rounded bg-zinc-500 shrink-0 mt-1.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Product B Card */}
                  <div className={`bg-zinc-950 border rounded-3xl p-6 relative overflow-hidden transition ${
                    selectedScan.result_json.winner === 'B' ? 'border-emerald-500/30' : 'border-zinc-900'
                  }`}>
                    {selectedScan.result_json.winner === 'B' && (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Winner 🏆
                      </div>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Product B</span>
                    <h4 className="text-lg font-black text-white mt-1.5">{selectedScan.result_json.product_b.brand}</h4>
                    <p className="text-zinc-450 text-xs truncate mb-5">{selectedScan.result_json.product_b.name}</p>

                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border font-black ${
                        selectedScan.result_json.product_b.safety_level === 'safe'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : selectedScan.result_json.product_b.safety_level === 'moderate'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        <span className="text-[8px] uppercase font-bold leading-none mb-1 text-zinc-500">Score</span>
                        <span className="text-xl leading-none">{selectedScan.result_json.product_b.health_score}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider block text-zinc-500 mb-1">Safety Level</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                          selectedScan.result_json.product_b.safety_level === 'safe'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : selectedScan.result_json.product_b.safety_level === 'moderate'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {selectedScan.result_json.product_b.safety_level}
                        </span>
                      </div>
                    </div>

                    <div className="h-[1px] bg-zinc-900 my-4" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-2">Highlights</p>
                    <ul className="space-y-1.5">
                      {selectedScan.result_json.product_b.highlights?.map((h: any, i: number) => (
                        <li key={i} className="text-xs text-zinc-350 flex items-start gap-2 select-text">
                          <div className="w-1.5 h-1.5 rounded bg-zinc-500 shrink-0 mt-1.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Comparative Table */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
                  <h3 className="text-md font-black text-white mb-6">Head-to-Head Nutrition Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-black tracking-wider">
                          <th className="pb-3 pr-2">Nutritional Field</th>
                          <th className="pb-3 px-2">Product A ({selectedScan.result_json.product_a.brand})</th>
                          <th className="pb-3 pl-2">Product B ({selectedScan.result_json.product_b.brand})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedScan.result_json.comparison_table || {}).map(([field, values]: any) => (
                          <tr key={field} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 transition select-text">
                            <td className="py-3 pr-2 font-bold text-zinc-300 capitalize">{field.replace('_', ' ')}</td>
                            <td className="py-3 px-2 text-zinc-450">{values.a}</td>
                            <td className="py-3 pl-2 text-zinc-450">{values.b}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bilingual verdicts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2">English Verdict</p>
                    <p className="text-xs text-zinc-300 leading-relaxed select-text">{selectedScan.result_json.verdict_english}</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6">
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2">Hindi Verdict (हिंदी निष्कर्ष)</p>
                    <p className="text-xs text-zinc-300 leading-relaxed select-text">{selectedScan.result_json.verdict_hindi}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="flex-[2] w-full">
                  <ResultCard result={selectedScan.result_json} imageUrl={historyImageUrl || selectedScan.result_json.image_url} />
                </div>
                
                {selectedScan.result_json.nutrition_facts && Object.keys(selectedScan.result_json.nutrition_facts).length > 0 && (
                  <div className="flex-1 w-full lg:sticky lg:top-24">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-3">Nutrition Panel</h3>
                    <NutritionTable nutrition={selectedScan.result_json.nutrition_facts} />
                  </div>
                )}
              </div>
            )}
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

              {scans.length > 0 && (
                <div className="flex gap-2.5">
                  {isSelectionMode ? (
                    <>
                      <button
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-zinc-300 hover:text-white border border-zinc-800 bg-zinc-950/40 px-3 py-2 rounded-lg transition cursor-pointer"
                      >
                        {selectedScanIds.size === filteredScans.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={selectedScanIds.size === 0}
                        className="text-xs font-bold text-rose-400 hover:text-rose-350 border border-rose-950/30 bg-rose-950/20 px-3 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
                      >
                        Delete Selected ({selectedScanIds.size})
                      </button>
                      <button
                        onClick={toggleSelectionMode}
                        className="text-xs font-bold text-zinc-450 hover:text-white border border-zinc-800 bg-zinc-900 px-3 py-2 rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={toggleSelectionMode}
                      className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950/40 px-3.5 py-2 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Manage History
                    </button>
                  )}
                </div>
              )}
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
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleSelectScan(scan.id)
                          } else {
                            setSelectedScan(scan)
                          }
                        }}
                        className={`flex items-center justify-between border bg-zinc-900/10 rounded-xl p-4 cursor-pointer transition ${
                          isSelectionMode && selectedScanIds.has(scan.id)
                            ? 'border-rose-500/50 bg-rose-500/5'
                            : 'border-zinc-850 hover:bg-zinc-900/40 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          {isSelectionMode && (
                            <input
                              type="checkbox"
                              checked={selectedScanIds.has(scan.id)}
                              onChange={() => {}} // Handled by outer container click
                              className="h-4.5 w-4.5 rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500 cursor-pointer mr-1 shrink-0"
                            />
                          )}
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
                                  {scan.barcode.startsWith('COMPARE:') ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Comparison Scan</span>
                                  ) : (
                                    <span>Barcode: {scan.barcode}</span>
                                  )}
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
