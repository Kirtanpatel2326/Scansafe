'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import ScanUpload from '@/components/ScanUpload'
import ResultCard, { IngredientAnalysisResult } from '@/components/ResultCard'
import NutritionTable from '@/components/NutritionTable'
import ScanFeedback from '@/components/ScanFeedback'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { 
  Sparkles, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  HelpCircle, 
  ChefHat, 
  Users, 
  TrendingUp, 
  Camera, 
  Trash2, 
  Plus, 
  Check, 
  FileText,
  X,
  Zap,
  GitCompare
} from 'lucide-react'

export default function ScanPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'scan' | 'composer' | 'family' | 'trends'>('scan')
  
  // User Session
  const [user, setUser] = useState<User | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [profile, setProfile] = useState<{ 
    plan: string 
    plan_type?: string
    plan_expires_at?: string | null
    scans_today: number
    scan_credits?: number
    dietary_profile?: {
      age?: number
      weight?: number
      allergies: string[]
      conditions: string[]
      goals: string[]
    }
  } | null>(null)

  // Scanner State
  const [scanResult, setScanResult] = useState<IngredientAnalysisResult | null>(null)
  const [scanId, setScanId] = useState<string>('')
  const [scanImageUrl, setScanImageUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // History / Recent scans
  const [recentScans, setRecentScans] = useState<any[]>([])

  // Meal Composer State
  const [selectedScanIds, setSelectedScanIds] = useState<string[]>([])
  const [itemQuantities, setItemQuantities] = useState<Record<string, { quantity: number; unit: 'g' | 'ml' | 'servings' }>>({})
  const [mealName, setMealName] = useState('')
  const [compositing, setCompositing] = useState(false)
  const [composedMeal, setComposedMeal] = useState<any | null>(null)
  const [composerHistory, setComposerHistory] = useState<any[]>([])

  // Family Mode / Profiles State
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Dietary Preferences Options (local controls)
  const [userAge, setUserAge] = useState<number | ''>('')
  const [userWeight, setUserWeight] = useState<number | ''>('')
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [customBlacklist, setCustomBlacklist] = useState<string[]>([])
  const [newBlacklistItem, setNewBlacklistItem] = useState('')

  useEffect(() => {
    // 1. Check active session (retrieves cached session and handles background refreshes)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetch('/api/profile/ensure', { method: 'POST' })
        await fetchProfile(currentUser.id)
        await fetchRecentScans(currentUser.id)
        await fetchFamilyMembers(currentUser.id)
        await fetchComposerHistory(currentUser.id)
        await fetchBlacklist(currentUser.id)
      }
      setLoadingSession(false)
    })

    // 2. Listen for auth changes (token refreshes, sign ins, sign outs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, plan_type, plan_expires_at, scans_today, scan_credits, dietary_profile')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setProfile(data as any)
        const dp = data.dietary_profile || {}
        setUserAge(dp.age || '')
        setUserWeight(dp.weight || '')
        setSelectedAllergies(dp.allergies || [])
        setSelectedConditions(dp.conditions || [])
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const fetchRecentScans = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error && data) {
        setRecentScans(data)
      }
    } catch (e) {
      console.error('Error fetching recent scans:', e)
    }
  }

  const fetchFamilyMembers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
      
      if (!error && data) {
        setFamilyMembers(data)
      }
    } catch (e) {
      console.error('Error loading family members:', e)
    }
  }

  const fetchComposerHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_compositions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setComposerHistory(data)
      }
    } catch (e) {
      console.error('Error loading composite meals:', e)
    }
  }

  const fetchBlacklist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('blacklist')
        .select('*')
        .eq('user_id', userId)
      
      if (!error && data) {
        setCustomBlacklist(data.map((b: any) => b.ingredient))
      }
    } catch (e) {
      console.error('Error loading blacklist:', e)
    }
  }

  const handleScanStart = () => {
    setScanResult(null)
    setScanId('')
    setScanImageUrl(null)
    setErrorMsg(null)
  }

  const handleScanComplete = async (result: any, newScanId?: string, imageUrl?: string) => {
    setScanResult(result)
    setScanId(newScanId || '')
    const finalImg = imageUrl || result?.image_url || result?.image || null
    setScanImageUrl(finalImg)
    setErrorMsg(null)
    setCompositing(false)
    setMealName('')
    
    // Refresh credits and history
    if (user) {
      await fetchProfile(user.id)
      await fetchRecentScans(user.id)
    }
  }

  const handleScanError = (error: string) => {
    if (error.startsWith('LIMIT_EXCEEDED:')) {
      const msg = error.replace('LIMIT_EXCEEDED:', '')
      setErrorMsg(msg)
    } else {
      setErrorMsg(error)
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setScanId('')
    setScanImageUrl(null)
    setErrorMsg(null)
  }

  // Meal Composer Submissions
  const handleQuantityChange = (id: string, qty: number) => {
    setItemQuantities((prev) => ({
      ...prev,
      [id]: {
        quantity: Math.max(1, isNaN(qty) ? 100 : qty),
        unit: prev[id]?.unit || 'g'
      }
    }))
  }

  const handleUnitChange = (id: string, unit: 'g' | 'ml' | 'servings') => {
    setItemQuantities((prev) => ({
      ...prev,
      [id]: {
        quantity: prev[id]?.quantity || 100,
        unit
      }
    }))
  }

  const handleComposeMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedScanIds.length === 0) return
    setCompositing(true)
    setComposedMeal(null)
    try {
      const items = selectedScanIds.map((id) => ({
        scanId: id,
        quantity: itemQuantities[id]?.quantity ?? 100,
        unit: itemQuantities[id]?.unit ?? 'g'
      }))

      const res = await fetch('/api/meal-composer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          mealName: mealName || 'Balanced Mix'
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setComposedMeal(data.meal)
        if (user) fetchComposerHistory(user.id)
      } else {
        alert(data.error || 'Failed to compose meal analysis.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCompositing(false)
    }
  }

  const toggleSelectScan = (id: string) => {
    setSelectedScanIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // Profile Customizations
  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    try {
      const dietaryProfile = {
        age: userAge ? Number(userAge) : null,
        weight: userWeight ? Number(userWeight) : null,
        allergies: selectedAllergies,
        conditions: selectedConditions
      }

      const { error } = await supabase
        .from('profiles')
        .update({ dietary_profile: dietaryProfile })
        .eq('id', user.id)

      if (!error) {
        alert('Dietary settings updated successfully!')
        fetchProfile(user.id)
      } else {
        throw error
      }
    } catch (err: any) {
      alert(err.message || 'Error updating settings.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMemberName.trim()) return
    try {
      const { error } = await supabase
        .from('family_members')
        .insert({
          user_id: user.id,
          name: newMemberName.trim().replace(/[<>]/g, ''),
          dietary_profile: { allergies: [], conditions: [] }
        })
      if (!error) {
        setNewMemberName('')
        fetchFamilyMembers(user.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteFamilyMember = async (id: string) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id)
      if (!error && user) {
        fetchFamilyMembers(user.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newBlacklistItem.trim()) return
    try {
      const item = newBlacklistItem.trim().toLowerCase().replace(/[<>]/g, '')
      const { error } = await supabase
        .from('blacklist')
        .insert({ user_id: user.id, ingredient: item })
      if (!error) {
        setNewBlacklistItem('')
        fetchBlacklist(user.id)
      } else {
        if (error.code === '23505') alert('Ingredient is already blacklisted.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveBlacklist = async (ingredient: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('blacklist')
        .delete()
        .eq('user_id', user.id)
        .eq('ingredient', ingredient)
      if (!error) {
        fetchBlacklist(user.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-zinc-500 text-sm mt-3 font-semibold">Validating session...</span>
      </div>
    )
  }

  // Calculate trends index counts
  const safetyStats = { safe: 0, moderate: 0, danger: 0 }
  let averageHistoryScore = 0
  if (recentScans.length > 0) {
    let sum = 0
    recentScans.forEach((s) => {
      sum += s.health_score || 0
      const safety = s.safety_level || 'moderate'
      if (safety === 'safe') safetyStats.safe++
      else if (safety === 'moderate') safetyStats.moderate++
      else if (safety === 'danger') safetyStats.danger++
    })
    averageHistoryScore = Math.round(sum / recentScans.length)
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner Details */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-zinc-900">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              ScanSafe <span className="text-emerald-400">ULTRA</span> <Sparkles className="w-6 h-6 text-emerald-400" />
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Food Toxicology Audit, Personalized Analytics, & Deep Marketplace Alternative Sourcing.
            </p>
          </div>
          
          {user && profile ? (
            <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-350 self-start md:self-auto">
              <span>Plan: <strong className="text-white uppercase">{profile.plan === 'pro' ? `PRO (${profile.plan_type || 'Pack'})` : 'Free'}</strong></span>
              <div className="w-[1px] h-3.5 bg-zinc-850" />
              <span>Available Credits: <strong className="text-emerald-400 font-black text-sm">{profile.scan_credits ?? 0}</strong></span>
              <div className="w-[1px] h-3.5 bg-zinc-850" />
              <Link href="/pricing" className="text-emerald-400 font-bold hover:underline">
                + Refill Pack
              </Link>
            </div>
          ) : !user ? (
            <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-350 self-start md:self-auto">
              <span>Plan: <strong className="text-white uppercase">Guest</strong></span>
              <div className="w-[1px] h-3.5 bg-zinc-850" />
              <Link href="/auth" className="text-emerald-400 font-bold hover:underline">
                Sign In to Scan
              </Link>
            </div>
          ) : null}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-850 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'scan'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4" /> Scanner
          </button>
          <button
            onClick={() => router.push('/compare')}
            className="flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 border-transparent text-zinc-450 hover:text-white transition whitespace-nowrap cursor-pointer"
          >
            <GitCompare className="w-4 h-4 text-emerald-400 fill-emerald-500/10" /> Compare Mode
          </button>
          <button
            onClick={() => {
              if (!user) {
                alert('Please sign in to use the Meal Composer.')
                return
              }
              setActiveTab('composer')
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'composer'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            } ${!user ? 'opacity-50' : ''}`}
          >
            <ChefHat className="w-4 h-4" /> Meal Composer
          </button>
          <button
            onClick={() => {
              if (!user) {
                alert('Please sign in to manage family profiles.')
                return
              }
              setActiveTab('family')
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'family'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            } ${!user ? 'opacity-50' : ''}`}
          >
            <Users className="w-4 h-4" /> Family Mode
          </button>
          <button
            onClick={() => {
              if (!user) {
                alert('Please sign in to view trends.')
                return
              }
              setActiveTab('trends')
            }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'trends'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            } ${!user ? 'opacity-50' : ''}`}
          >
            <TrendingUp className="w-4 h-4" /> Trends
          </button>
        </div>

        {/* SCANNER PANEL */}
        {activeTab === 'scan' && (
          <div className="flex flex-col gap-6">
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-300">Analysis Notice</h4>
                  <p className="text-rose-400/90 text-xs mt-1">{errorMsg}</p>
                </div>
              </div>
            )}

            {!user ? (
              <div className="max-w-2xl mx-auto w-full text-center border border-zinc-800 bg-zinc-950/60 rounded-3xl p-8 py-12">
                <Camera className="w-12 h-12 text-zinc-500 mx-auto mb-4 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-2">Scan Food Ingredients</h3>
                <p className="text-zinc-400 text-sm max-w-md mx-auto mb-6">
                  You can browse our website and review dashboard statistics, but you must sign in to scan product ingredients.
                </p>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Sign In to Scan
                </Link>
              </div>
            ) : !scanResult ? (
              <div className="max-w-2xl mx-auto w-full">
                <ScanUpload
                  onScanStart={handleScanStart}
                  onScanSuccess={handleScanComplete}
                  onScanError={handleScanError}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-6">


                <div className="flex flex-col gap-6 items-start">
                  <div className="w-full">
                    <ResultCard result={scanResult} scanId={scanId} imageUrl={scanImageUrl} onScanAnother={resetScanner} />
                  </div>
                  <div className="w-full max-w-2xl mx-auto mt-2">
                    <ScanFeedback scanId={scanId} />
                  </div>
                  {scanResult.nutrition_facts && Object.keys(scanResult.nutrition_facts).length > 0 && (
                    <div className="w-full mt-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3.5">Nutrition facts Panel</h3>
                      <NutritionTable nutrition={scanResult.nutrition_facts} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MEAL COMPOSER PANEL */}
        {activeTab === 'composer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border border-zinc-850 rounded-2xl p-6 bg-zinc-950/10 self-start">
              <h3 className="text-base font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-emerald-400" /> New Composition
              </h3>
              
              <form onSubmit={handleComposeMeal} className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Meal Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. My Breakfast Blend"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Select Items to Combine</label>
                  <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                    {recentScans.length > 0 ? (
                      recentScans.map((s) => {
                        const isSelected = selectedScanIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border p-3 transition text-xs ${
                              isSelected
                                ? 'bg-emerald-950/20 border-emerald-500 text-emerald-350'
                                : 'bg-zinc-900/50 border-zinc-850 text-zinc-300'
                            }`}
                          >
                            <div
                              onClick={() => toggleSelectScan(s.id)}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-white block truncate">{s.product_name}</span>
                                <span className="text-[10px] text-zinc-500">Score: {s.health_score ?? 'N/A'}</span>
                              </div>
                              <div className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${
                                isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-emerald-900/40 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Portion:</span>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    max="5000"
                                    value={itemQuantities[s.id]?.quantity ?? 100}
                                    onChange={(e) => handleQuantityChange(s.id, parseInt(e.target.value, 10))}
                                    className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-emerald-500"
                                  />
                                  <select
                                    value={itemQuantities[s.id]?.unit ?? 'g'}
                                    onChange={(e) => handleUnitChange(s.id, e.target.value as 'g' | 'ml' | 'servings')}
                                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                                  >
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="servings">servings</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-zinc-500 text-center py-4 text-xs">No recent scans available. Go scan some foods first!</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={selectedScanIds.length === 0 || compositing}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3.5 rounded-xl text-sm transition disabled:bg-zinc-850 disabled:text-zinc-500 cursor-pointer"
                >
                  {compositing ? 'Analyzing Composite Meal...' : `Analyze Combined Items (${selectedScanIds.length})`}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              {composedMeal ? (
                /* Composition Results */
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b border-zinc-850 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Analysis Result</span>
                      <h3 className="text-xl font-bold text-white mt-1">{composedMeal.meal_name}</h3>
                    </div>
                    {composedMeal.id && (
                      <a
                        href={`/api/export-pdf?mealId=${composedMeal.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" /> Export PDF
                      </a>
                    )}
                  </div>

                  {composedMeal.quantity_breakdown && composedMeal.quantity_breakdown.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {composedMeal.quantity_breakdown.map((q: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                          <span className="font-bold text-emerald-400">{q.quantity}</span> {q.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl">
                    <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex flex-col items-center justify-center shrink-0">
                      <span className="text-lg font-black">{composedMeal.health_score}</span>
                      <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider">Score</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Composite Health Score</h4>
                      <p className="text-zinc-350 text-xs mt-1 leading-relaxed">{composedMeal.composite_verdict}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/20 border border-zinc-850 p-3 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Calories</span>
                      <span className="text-white font-black text-sm">{composedMeal.nutrition_summary.calories} kcal</span>
                    </div>
                    <div className="bg-zinc-900/20 border border-zinc-850 p-3 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Sugars</span>
                      <span className="text-white font-black text-sm">{composedMeal.nutrition_summary.sugar}</span>
                    </div>
                    <div className="bg-zinc-900/20 border border-zinc-850 p-3 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Sodium</span>
                      <span className="text-white font-black text-sm">{composedMeal.nutrition_summary.sodium}</span>
                    </div>
                    <div className="bg-zinc-900/20 border border-zinc-850 p-3 rounded-xl text-center">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 block mb-1">Protein</span>
                      <span className="text-white font-black text-sm">{composedMeal.nutrition_summary.protein}</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-850 pt-5">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Additives & Allergens Warning Log</h4>
                    <ul className="text-zinc-300 text-xs space-y-2.5 list-disc pl-4">
                      {composedMeal.additives.map((a: any, idx: number) => (
                        <li key={idx}>
                          <strong className="text-zinc-200">{a.name} ({a.code || 'Stabilizer'})</strong>: {a.description}
                        </li>
                      ))}
                      {composedMeal.allergens.length > 0 && (
                        <li className="text-rose-400 font-bold list-none pl-0">
                          ⚠️ Combined Allergen Warning: Contains {composedMeal.allergens.join(', ')}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                /* History of Meals */
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/20 p-6">
                  <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-widest">Past Composed Meals</h3>
                  <div className="flex flex-col gap-3">
                    {composerHistory.length > 0 ? (
                      composerHistory.map((meal) => {
                        const m = meal.analysis_json
                        return (
                          <div
                            key={meal.id}
                            className="bg-zinc-900/50 border border-zinc-850 hover:border-zinc-800 transition p-4 rounded-xl flex justify-between items-center"
                          >
                            <div>
                              <h4 className="font-bold text-white text-sm">{meal.name}</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                Scanned {m.product_count} items · Score: {m.health_score}/100
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setComposedMeal({ ...m, id: meal.id })}
                                className="bg-zinc-800 hover:bg-zinc-750 text-[10px] font-bold text-zinc-200 px-3 py-1.5 rounded-lg transition"
                              >
                                View Details
                              </button>
                              <a
                                href={`/api/export-pdf?mealId=${meal.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-zinc-800 hover:bg-zinc-750 p-1.5 rounded-lg text-emerald-400 transition"
                                title="Print Report"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-zinc-500 text-center py-10 text-xs">No composite meals composed yet. Combine items above to evaluate recipes!</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FAMILY / PROFILES PANEL */}
        {activeTab === 'family' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Primary Profile Settings */}
            <div className="rounded-2xl border border-zinc-850 bg-zinc-950/15 p-6">
              <h3 className="text-base font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Primary Health Profile
              </h3>

              <form onSubmit={handleSaveProfileSettings} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Age</label>
                    <input
                      type="number"
                      placeholder="e.g. 28"
                      value={userAge}
                      onChange={(e) => setUserAge(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      placeholder="e.g. 70"
                      value={userWeight}
                      onChange={(e) => setUserWeight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Dietary Concerns & Restrictions</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'gluten-free', label: 'Gluten-Free' },
                      { id: 'dairy-free', label: 'Dairy-Free (Milk Allergy)' },
                      { id: 'lactose-free', label: 'Lactose Intolerant' },
                      { id: 'nut-free', label: 'Nut-Free' },
                      { id: 'vegan', label: 'Vegan' },
                      { id: 'vegetarian', label: 'Vegetarian' },
                      { id: 'jain', label: 'Jain Diet (No Roots)' },
                      { id: 'diabetic', label: 'Diabetes' },
                      { id: 'hypertension', label: 'Hypertension' },
                      { id: 'pregnancy', label: 'Pregnancy-Safe' },
                      { id: 'cardiovascular', label: 'Heart-Conscious' }
                    ].map((pref) => {
                      const isSelected = selectedAllergies.includes(pref.id) || selectedConditions.includes(pref.id)
                      const togglePref = () => {
                        if (['gluten-free', 'dairy-free', 'lactose-free', 'nut-free', 'vegan', 'vegetarian'].includes(pref.id)) {
                          setSelectedAllergies((prev) => 
                            prev.includes(pref.id) ? prev.filter((p) => p !== pref.id) : [...prev, pref.id]
                          )
                        } else {
                          setSelectedConditions((prev) => 
                            prev.includes(pref.id) ? prev.filter((p) => p !== pref.id) : [...prev, pref.id]
                          )
                        }
                      }
                      return (
                        <button
                          key={pref.id}
                          type="button"
                          onClick={togglePref}
                          className={`flex items-center gap-2 rounded-xl border p-3 text-left transition cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-950/20 border-emerald-500 text-emerald-350' 
                              : 'bg-zinc-900/40 border-zinc-850 text-zinc-400'
                          }`}
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{pref.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl text-sm transition"
                >
                  {savingProfile ? 'Updating dietary rules...' : 'Save Settings'}
                </button>
              </form>
            </div>

            {/* Custom Blacklist & Family Members */}
            <div className="flex flex-col gap-6">
              {/* Blacklist */}
              <div className="rounded-2xl border border-zinc-850 bg-zinc-950/15 p-6">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Custom Ingredients Blacklist</h3>
                <p className="text-zinc-500 text-xs mb-3 leading-relaxed">
                  Flag products immediately if they contain any of these specific ingredients:
                </p>

                <form onSubmit={handleAddBlacklist} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="e.g. Palm oil, MSG, Gelatin"
                    value={newBlacklistItem}
                    onChange={(e) => setNewBlacklistItem(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-zinc-800 border border-zinc-750 hover:bg-zinc-700 text-white text-xs font-bold px-4 rounded-xl transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {customBlacklist.length > 0 ? (
                    customBlacklist.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/10 bg-rose-500/5 px-2.5 py-1 text-xs font-semibold text-rose-350"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveBlacklist(item)}
                          className="hover:text-rose-200 transition"
                        >
                          <X className="w-3 h-3 cursor-pointer" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-zinc-500 text-xs italic py-2">No custom blacklisted items.</p>
                  )}
                </div>
              </div>

              {/* Family Members Mode */}
              <div className="rounded-2xl border border-zinc-850 bg-zinc-950/15 p-6">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Family Profiles</h3>
                <p className="text-zinc-500 text-xs mb-4">
                  Create and manage sub-profiles to check allergen compatibility for family members:
                </p>

                <form onSubmit={handleAddFamilyMember} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="e.g. Son, Daughter, Spouse"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-zinc-800 border border-zinc-750 hover:bg-zinc-700 text-white text-xs font-bold px-4 rounded-xl transition flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Create
                  </button>
                </form>

                <div className="flex flex-col gap-2">
                  {familyMembers.length > 0 ? (
                    familyMembers.map((member) => (
                      <div
                        key={member.id}
                        className="bg-zinc-900/50 border border-zinc-850 p-3.5 rounded-xl flex justify-between items-center text-xs"
                      >
                        <div>
                          <strong className="text-white">{member.name}</strong>
                          <span className="text-zinc-500 text-[10px] block mt-0.5">Family Profile Active</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFamilyMember(member.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1.5 transition"
                        >
                          <Trash2 className="w-4 h-4 cursor-pointer" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-500 text-xs italic py-2">No secondary family profiles created.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRENDS PANEL */}
        {activeTab === 'trends' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 border border-zinc-850 rounded-2xl p-6 bg-zinc-950/10 text-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Audited Average</span>
              <h3 className="text-4xl font-black text-white">{averageHistoryScore || 'N/A'}</h3>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                Your average product safety scan score over the last 10 analyzed items.
              </p>
            </div>

            <div className="md:col-span-2 border border-zinc-850 rounded-2xl p-6 bg-zinc-950/10">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Safety Verdict Distribution</h3>
              
              {recentScans.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {/* Danger verdict */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-rose-400">High Risk / Avoid</span>
                      <span>{safetyStats.danger} items</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(safetyStats.danger / recentScans.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Moderate verdict */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-amber-400">Moderate Caution</span>
                      <span>{safetyStats.moderate} items</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2">
                      <div
                        className="bg-amber-400 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(safetyStats.moderate / recentScans.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Safe verdict */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-emerald-400">Safe & Clean</span>
                      <span>{safetyStats.safe} items</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(safetyStats.safe / recentScans.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-550 text-xs italic text-center py-8">Not enough data to calculate trends. Go scan some items first!</p>
              )}
            </div>

            {/* List of recent scans */}
            <div className="col-span-full border border-zinc-850 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Recent Audit Log</h3>
              <div className="flex flex-col gap-3">
                {recentScans.length > 0 ? (
                  recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-850 hover:border-zinc-800 transition"
                    >
                      <div>
                        <strong className="text-sm text-zinc-200">{scan.product_name}</strong>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          Audited: {new Date(scan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full border px-2 py-0.5 ${
                          scan.safety_level === 'safe' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : scan.safety_level === 'moderate' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {scan.safety_level} ({scan.health_score})
                        </span>
                        <button
                          onClick={() => {
                            setScanResult(scan.result_json)
                            setScanId(scan.id)
                            setScanImageUrl(scan.result_json?.image_url || scan.result_json?.image || null)
                            setActiveTab('scan')
                          }}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                        >
                          Recall
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-550 text-xs italic text-center py-6">Your scanned items will show up here.</p>
                )}
              </div>
            </div>

            {/* Toxin Tracking Engine Coming Soon Card */}
            <div className="col-span-full border border-rose-500/20 bg-rose-500/5 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <Zap className="w-32 h-32 text-rose-500" />
              </div>
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 px-3 py-1 text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-4">
                  Feature Coming Soon
                </span>
                <h3 className="text-2xl font-black text-white mb-2">Toxin Tracking Engine</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
                  We are building a ruthless tracking engine to monitor your cumulative toxic intake over time, warning you before irreversible damage occurs.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

