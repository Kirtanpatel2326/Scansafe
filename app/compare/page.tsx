'use client'

import React, { useEffect, useState, useRef } from 'react'
import Header from '@/components/Header'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { 
  GitCompare, 
  Upload, 
  Camera, 
  Trash2, 
  Sparkles, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Share2,
  Lock,
  Plus,
  Bookmark,
  Scale,
  Layers,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react'

interface ComparisonResult {
  winner: 'A' | 'B' | 'tie' | 'undetermined'
  winner_reason: string
  is_basis_compatible?: boolean
  concrete_differences?: Array<{
    nutrient: string
    unit: string
    valA: number
    valB: number
    diff: number
    interpretation: string
  }>
  product_a: {
    name: string
    brand: string
    health_score?: number | null
    safety_level: 'safe' | 'moderate' | 'danger' | 'insufficient_evidence'
    highlights: string[]
    pack_size?: string
    variant?: string
    review_status?: string
    last_reviewed_at?: string
    dietary_alerts?: Array<{
      preference_label: string
      state: string
      title: string
      explanation: string
      source_label_text?: string
    }>
  }
  product_b: {
    name: string
    brand: string
    health_score?: number | null
    safety_level: 'safe' | 'moderate' | 'danger' | 'insufficient_evidence'
    highlights: string[]
    pack_size?: string
    variant?: string
    review_status?: string
    last_reviewed_at?: string
    dietary_alerts?: Array<{
      preference_label: string
      state: string
      title: string
      explanation: string
      source_label_text?: string
    }>
  }
  comparison_table?: {
    calories?: { a?: string | null; b?: string | null }
    sugar?: { a?: string | null; b?: string | null }
    added_sugar?: { a?: string | null; b?: string | null }
    sodium?: { a?: string | null; b?: string | null }
    protein?: { a?: string | null; b?: string | null }
    fat?: { a?: string | null; b?: string | null }
    saturated_fat?: { a?: string | null; b?: string | null }
    fiber?: { a?: string | null; b?: string | null }
    additives?: { a?: string | null; b?: string | null }
    fssai_status?: { a?: string | null; b?: string | null }
    basis?: string
    basis_a?: string
    basis_b?: string
    [key: string]: any
  }
  verdict_english?: string
  verdict_hindi?: string
}

const PREFERENCE_OPTIONS = [
  { id: 'diabetic', label: 'Diabetic-Friendly (Low Glycemic)' },
  { id: 'hypertension', label: 'Hypertension (Low Sodium)' },
  { id: 'gluten_free', label: 'Gluten-Free' },
  { id: 'dairy_free', label: 'Dairy-Free (Milk Protein Allergy)' },
  { id: 'lactose_free', label: 'Lactose Intolerant' },
  { id: 'soy_free', label: 'Soy-Free' },
  { id: 'nut_free', label: 'Nut-Allergy (Peanut & Tree Nut)' },
  { id: 'weight_loss', label: 'Weight Loss (Low Cal/Fat)' },
  { id: 'high_protein', label: 'High Protein (Fitness Goal)' },
  { id: 'vegan', label: 'Vegan / Plant-Based' },
  { id: 'kid_safe', label: 'Kid-Safe (No Harmful Colors/Preservatives)' }
]

export default function ComparePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  // Preferences selected (persisted in localStorage)
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([])

  // Image states
  const [imageA, setImageA] = useState<string | null>(null)
  const [imageB, setImageB] = useState<string | null>(null)
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)

  // Saved Catalog product states (0 credit direct comparison)
  const [savedProductA, setSavedProductA] = useState<any | null>(null)
  const [savedProductB, setSavedProductB] = useState<any | null>(null)

  // Saved picker modal state
  const [isSavedPickerOpen, setIsSavedPickerOpen] = useState(false)
  const [pickerTarget, setPickerTarget] = useState<'A' | 'B' | null>(null)
  const [savedItems, setSavedItems] = useState<any[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)

  // Camera states
  const [cameraActive, setCameraActive] = useState<'A' | 'B' | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // Loading & Results
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [compareOpKey, setCompareOpKey] = useState<string>(() => 
    typeof crypto !== 'undefined' && crypto.randomUUID ? `cmp_${crypto.randomUUID()}` : `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  )

  // Check auth session & load any saved items from session storage
  useEffect(() => {
    let isMounted = true

    // Safety timeout: never leave user hanging on loading spinner
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoadingSession(false)
    }, 1200)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      setUser(session?.user ?? null)
      setLoadingSession(false)
      clearTimeout(safetyTimer)
    }).catch((err) => {
      console.warn('Compare session check warning:', err)
      if (isMounted) setLoadingSession(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUser(session?.user ?? null)
    })

    // Check for saved items stored in session
    if (typeof window !== 'undefined') {
      try {
        const itemA = sessionStorage.getItem('scansafe_compare_saved_A')
        const itemB = sessionStorage.getItem('scansafe_compare_saved_B')
        if (itemA) {
          setSavedProductA(JSON.parse(itemA))
          sessionStorage.removeItem('scansafe_compare_saved_A')
        }
        if (itemB) {
          setSavedProductB(JSON.parse(itemB))
          sessionStorage.removeItem('scansafe_compare_saved_B')
        }
      } catch (e) {
        console.error('Error loading session compare items:', e)
      }
    }

    // Load persisted preferences
    const saved = localStorage.getItem('scansafe_compare_prefs')
    if (saved) {
      try {
        setSelectedPrefs(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading preferences from storage', e)
      }
    }

    return () => {
      subscription.unsubscribe()
      stopCamera()
    }
  }, [])

  // Open saved item picker
  const openSavedPicker = async (target: 'A' | 'B') => {
    setPickerTarget(target)
    setIsSavedPickerOpen(true)
    setLoadingSaved(true)
    try {
      const res = await fetch('/api/saved')
      if (res.ok) {
        const data = await res.json()
        setSavedItems(data.items || [])
      }
    } catch (e) {
      console.error('Error fetching saved items:', e)
    } finally {
      setLoadingSaved(false)
    }
  }

  const selectSavedItem = (item: any) => {
    if (pickerTarget === 'A') {
      setSavedProductA(item.result_json)
      setImageA(null)
      setFileA(null)
    } else if (pickerTarget === 'B') {
      setSavedProductB(item.result_json)
      setImageB(null)
      setFileB(null)
    }
    setIsSavedPickerOpen(false)
    setPickerTarget(null)
  }

  // Toggle Preferences
  const handleTogglePref = (prefId: string) => {
    setCompareOpKey(typeof crypto !== 'undefined' && crypto.randomUUID ? `cmp_${crypto.randomUUID()}` : `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
    let updated: string[]
    if (selectedPrefs.includes(prefId)) {
      updated = selectedPrefs.filter(p => p !== prefId)
    } else {
      updated = [...selectedPrefs, prefId]
    }
    setSelectedPrefs(updated)
    localStorage.setItem('scansafe_compare_prefs', JSON.stringify(updated))
  }

  // Convert File to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
    const file = e.target.files?.[0]
    if (!file) return

    setCompareOpKey(typeof crypto !== 'undefined' && crypto.randomUUID ? `cmp_${crypto.randomUUID()}` : `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
    if (target === 'A') {
      setFileA(file)
      setSavedProductA(null)
    } else {
      setFileB(file)
      setSavedProductB(null)
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (target === 'A') setImageA(reader.result as string)
      else setImageB(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Camera handling
  const startCamera = async (target: 'A' | 'B') => {
    setCameraActive(target)
    setErrorMsg(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err: any) {
      console.error('Camera access failed:', err)
      setErrorMsg('Failed to open your camera. Please check permissions.')
      setCameraActive(null)
    }
  }

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    setCameraActive(null)
  }

  const capturePhoto = (target: 'A' | 'B') => {
    if (!videoRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    const ctx = canvas.getContext('2d')

    if (ctx && videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg')
      if (target === 'A') {
        setImageA(dataUrl)
        setSavedProductA(null)
      } else {
        setImageB(dataUrl)
        setSavedProductB(null)
      }
    }
    stopCamera()
  }

  const removePhoto = (target: 'A' | 'B') => {
    if (target === 'A') {
      setImageA(null)
      setFileA(null)
      setSavedProductA(null)
    } else {
      setImageB(null)
      setFileB(null)
      setSavedProductB(null)
    }
  }

  // Determine if this comparison is 0-credit or requires credits
  const isDirectSavedComparison = Boolean(savedProductA && savedProductB)

  // Start Comparison API Call
  const handleCompare = async () => {
    if (!user) {
      router.push('/auth')
      return
    }

    const hasA = Boolean(imageA || savedProductA)
    const hasB = Boolean(imageB || savedProductB)

    if (!hasA || !hasB) {
      setErrorMsg('Please select or upload details for both Product A and Product B.')
      return
    }

    setAnalyzing(true)
    setErrorMsg(null)
    setResult(null)

    try {
      const mappedPrefs = selectedPrefs.map(
        p => PREFERENCE_OPTIONS.find(o => o.id === p)?.label || p
      )

      const idempotencyKey = compareOpKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? `cmp_${crypto.randomUUID()}` : `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
      
      const payload: any = {
        preferences: mappedPrefs,
        idempotencyKey
      }

      if (isDirectSavedComparison) {
        payload.productA = savedProductA
        payload.productB = savedProductB
      } else {
        payload.imageA = imageA
        payload.imageB = imageB
      }

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Comparison failed to process.')
      }

      setCompareOpKey(typeof crypto !== 'undefined' && crypto.randomUUID ? `cmp_${crypto.randomUUID()}` : `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
      setResult(data.comparison)
      
      setTimeout(() => {
        document.getElementById('comparison-results')?.scrollIntoView({ behavior: 'smooth' })
      }, 300)

    } catch (err: any) {
      console.error('Compare execution failed:', err)
      setErrorMsg(err.message || 'An error occurred during comparison analysis.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Format WhatsApp Share message
  const getWhatsAppShareUrl = () => {
    if (!result) return '#'
    if (result.winner === 'undetermined') {
      const text = `ScanSafe Comparison Alert! 🔍\n\nComparison inconclusive due to different nutrition bases or unreadable packaging facts.\n\nProduct A: ${result.product_a.brand || ''} ${result.product_a.name || ''}\nProduct B: ${result.product_b.brand || ''} ${result.product_b.name || ''}\n\nReason: ${result.winner_reason}\n\nCompare your foods safely at https://scansafe.co.in/compare`
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    }
    if (result.winner === 'tie') {
      const scoreA = result.product_a.health_score != null ? `Score: ${result.product_a.health_score}` : 'Unrated'
      const scoreB = result.product_b.health_score != null ? `Score: ${result.product_b.health_score}` : 'Unrated'
      const text = `ScanSafe Comparison Alert! 🔍\n\n🤝 It's a Healthy Tie!\nProduct A: ${result.product_a.brand || ''} ${result.product_a.name || ''} (${scoreA})\nProduct B: ${result.product_b.brand || ''} ${result.product_b.name || ''} (${scoreB})\n\nReason: ${result.winner_reason}\n\nCompare your foods at https://scansafe.co.in/compare`
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
    }
    const winProd = result.winner === 'A' ? result.product_a : result.product_b
    const loseProd = result.winner === 'A' ? result.product_b : result.product_a
    
    const winScore = winProd.health_score != null ? `Score: ${winProd.health_score}` : 'Unrated'
    const loseScore = loseProd.health_score != null ? `Score: ${loseProd.health_score}` : 'Unrated'
    const text = `ScanSafe Comparison Alert! 🔍\n\n🏆 Winner: ${winProd.brand || ''} ${winProd.name || ''} (${winScore})\n❌ Alternate: ${loseProd.brand || ''} ${loseProd.name || ''} (${loseScore})\n\nReason: ${result.winner_reason}\n\nCompare your shopping cart items now at https://scansafe.co.in/compare`
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-zinc-500 text-sm mt-3">Loading Compare Mode...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />

      {/* Saved Item Picker Modal */}
      {isSavedPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Select from Saved Products</h3>
                <p className="text-xs text-zinc-400">Choose a product for Slot {pickerTarget} (0 Credits)</p>
              </div>
              <button
                onClick={() => setIsSavedPickerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
              {loadingSaved ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                  Loading your saved pantry...
                </div>
              ) : savedItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-400">
                  No saved products found. Scan a product or browse the catalog first!
                </div>
              ) : (
                savedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectSavedItem(item)}
                    className="w-full text-left p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:border-emerald-500/50 transition flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        {item.brand || item.result_json?.brand || "Unbranded"}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
                        {item.product_name}
                      </h4>
                      {item.pack_size && (
                        <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                          Pack: {item.pack_size}
                        </span>
                      )}
                    </div>
                    {item.result_json?.health_score != null && (
                      <span className="text-xs font-black px-2 py-1 rounded bg-zinc-800 text-emerald-400 shrink-0">
                        Score {item.result_json.health_score}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner Details */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-zinc-900">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              Side-by-Side <span className="text-emerald-400">Compare</span> <GitCompare className="w-6 h-6 text-emerald-400" />
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Strict same-basis nutritional comparison, concrete macro differences, and separated dietary safety alerts.
            </p>
          </div>
          
          {!user && (
            <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-350 self-start md:self-auto">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-bold">Please sign in to analyze products</span>
            </div>
          )}
        </div>

        {/* 1. HEALTH PROFILE SELECTOR */}
        <section className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8 mb-8">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-emerald-400" /> 1. Select Your Health Profile
          </h3>
          <p className="text-zinc-500 text-xs mb-6">These options will be saved locally on your device for future comparisons.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {PREFERENCE_OPTIONS.map((pref) => {
              const isSelected = selectedPrefs.includes(pref.id)
              return (
                <button
                  key={pref.id}
                  onClick={() => handleTogglePref(pref.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition text-xs font-bold cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/20 border-emerald-500 text-white'
                      : 'bg-zinc-900/20 border-zinc-850/60 text-zinc-400 hover:border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span>{pref.label}</span>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2 ${
                    isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-700'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3.5]" />}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Upfront Credit Disclosure Notice */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isDirectSavedComparison ? (
                <strong className="text-emerald-400 font-bold">
                  Zero Credits Used — Comparing 2 verified saved pantry records.
                </strong>
              ) : (
                <span>
                  <strong>Credit Policy:</strong> Comparing saved pantry records costs <strong className="text-emerald-400">0 credits</strong>. New photo OCR analysis consumes <strong>2 credits</strong>.
                </span>
              )}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-zinc-750 bg-zinc-900 text-zinc-400">
            {isDirectSavedComparison ? "0 Credits" : "2 Credits for Photos"}
          </span>
        </div>

        {/* 2. DUAL UPLOADS / SAVED SELECTORS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Product A */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-zinc-400">Product A</h4>
                  {savedProductA && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      Saved Item
                    </span>
                  )}
                </div>
                {(imageA || savedProductA) && (
                  <button 
                    onClick={() => removePhoto('A')}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {savedProductA ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">
                        {savedProductA.brand || 'Unbranded'}
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {savedProductA.product_name}
                      </h4>
                      {savedProductA.pack_size && (
                        <span className="text-xs text-zinc-400 font-mono mt-0.5 block">
                          Pack: {savedProductA.pack_size}
                        </span>
                      )}
                    </div>
                    {savedProductA.health_score != null && (
                      <span className="text-xs font-black px-2.5 py-1 rounded bg-zinc-900 text-emerald-400 border border-emerald-500/20">
                        Score {savedProductA.health_score}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Layers className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Basis: {savedProductA.nutrition_basis || 'per_100g'}</span>
                  </div>
                </div>
              ) : imageA ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-850 bg-black flex items-center justify-center">
                  <img src={imageA} alt="Product A Label" className="h-full object-contain" />
                  {analyzing && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-0 w-full h-[3px] bg-emerald-500 shadow-[0_0_12px_#10b981] animate-[scan-line_2.5s_ease-in-out_infinite]" />
                      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-emerald-500/10 mix-blend-overlay" />
                    </div>
                  )}
                </div>
              ) : cameraActive === 'A' ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-emerald-500 bg-black flex flex-col items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  <div className="absolute bottom-4 flex gap-3">
                    <button 
                      onClick={() => capturePhoto('A')}
                      className="bg-emerald-500 text-black font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center bg-zinc-950/40">
                  <Upload className="w-8 h-8 text-zinc-650 mb-3" />
                  <p className="text-xs text-zinc-400 font-semibold mb-4">Select from saved items or upload label photo</p>
                  
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    <button
                      onClick={() => openSavedPicker('A')}
                      className="bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
                    >
                      <Bookmark className="w-3.5 h-3.5" /> Pick from Saved (0 Credits)
                    </button>
                    <label className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'A')}
                        className="hidden" 
                      />
                      Select Image
                    </label>
                    <button
                      onClick={() => startCamera('A')}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" /> Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product B */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-zinc-400">Product B</h4>
                  {savedProductB && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      Saved Item
                    </span>
                  )}
                </div>
                {(imageB || savedProductB) && (
                  <button 
                    onClick={() => removePhoto('B')}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {savedProductB ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">
                        {savedProductB.brand || 'Unbranded'}
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {savedProductB.product_name}
                      </h4>
                      {savedProductB.pack_size && (
                        <span className="text-xs text-zinc-400 font-mono mt-0.5 block">
                          Pack: {savedProductB.pack_size}
                        </span>
                      )}
                    </div>
                    {savedProductB.health_score != null && (
                      <span className="text-xs font-black px-2.5 py-1 rounded bg-zinc-900 text-emerald-400 border border-emerald-500/20">
                        Score {savedProductB.health_score}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Layers className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Basis: {savedProductB.nutrition_basis || 'per_100g'}</span>
                  </div>
                </div>
              ) : imageB ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-850 bg-black flex items-center justify-center">
                  <img src={imageB} alt="Product B Label" className="h-full object-contain" />
                  {analyzing && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-0 w-full h-[3px] bg-emerald-500 shadow-[0_0_12px_#10b981] animate-[scan-line_2.5s_ease-in-out_infinite]" />
                      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-emerald-500/10 mix-blend-overlay" />
                    </div>
                  )}
                </div>
              ) : cameraActive === 'B' ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-emerald-500 bg-black flex flex-col items-center justify-center">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  <div className="absolute bottom-4 flex gap-3">
                    <button 
                      onClick={() => capturePhoto('B')}
                      className="bg-emerald-500 text-black font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Capture Photo
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="bg-zinc-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center bg-zinc-950/40">
                  <Upload className="w-8 h-8 text-zinc-650 mb-3" />
                  <p className="text-xs text-zinc-400 font-semibold mb-4">Select from saved items or upload label photo</p>
                  
                  <div className="flex flex-wrap gap-2.5 justify-center">
                    <button
                      onClick={() => openSavedPicker('B')}
                      className="bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
                    >
                      <Bookmark className="w-3.5 h-3.5" /> Pick from Saved (0 Credits)
                    </button>
                    <label className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'B')}
                        className="hidden" 
                      />
                      Select Image
                    </label>
                    <button
                      onClick={() => startCamera('B')}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" /> Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* Action triggers */}
        <div className="flex flex-col items-center gap-4 mb-12">
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-2xl text-rose-400 text-xs font-bold flex items-center gap-2 max-w-md">
              <AlertCircle className="w-4.5 h-4.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            disabled={analyzing}
            onClick={handleCompare}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-900 border disabled:border-zinc-800 disabled:text-zinc-600 text-black text-sm font-black py-4 px-10 rounded-2xl cursor-pointer transition shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center gap-2.5 justify-center min-w-[240px]"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing Labels...
              </>
            ) : (
              <>
                <GitCompare className="w-5 h-5" /> Compare These Products ({isDirectSavedComparison ? "0 Credits" : "2 Credits"})
              </>
            )}
          </button>
        </div>

        {/* 3. COMPARISON RESULTS BLOCK */}
        {result && (
          <section id="comparison-results" className="scroll-mt-6 flex flex-col gap-8 mb-16">
            
            {/* INCOMPATIBLE BASIS ALERT */}
            {result.is_basis_compatible === false && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 flex items-start gap-3 text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">
                    Different Nutrition Bases (Non-Comparable on Equal Terms)
                  </h4>
                  <p className="text-xs text-amber-400/90 mt-1 leading-relaxed">
                    One product is measured in solid mass (e.g. per 100g) while the other is measured in liquid volume (e.g. per 100ml). Without verified density data, direct mathematical ranking is prohibited. ScanSafe evaluates differences qualitatively rather than declaring a false winner.
                  </p>
                </div>
              </div>
            )}

            {/* WINNER / VERDICT CONTAINER */}
            <div className={`relative rounded-3xl border p-6 md:p-8 overflow-hidden shadow-xl ${
              result.winner === 'undetermined'
                ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-black shadow-amber-500/5'
                : result.winner === 'tie'
                ? 'border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-zinc-950 to-black shadow-blue-500/5'
                : 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-black shadow-emerald-500/5'
            }`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900/60 pb-5 mb-5">
                <div>
                  <span className={`text-[10px] border px-3 py-1 rounded-full uppercase tracking-wider font-extrabold flex items-center gap-1.5 w-fit ${
                    result.winner === 'undetermined'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : result.winner === 'tie'
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {result.winner === 'undetermined' ? (
                      <><AlertCircle className="w-3.5 h-3.5" /> Comparison Inconclusive</>
                    ) : result.winner === 'tie' ? (
                      <><Sparkles className="w-3.5 h-3.5 fill-blue-400" /> Healthy Tie</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5 fill-emerald-400" /> Comparison Winner</>
                    )}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-white mt-3">
                    {result.winner === 'A' 
                      ? `${result.product_a.brand || ''} ${result.product_a.name || 'Product A'}`
                      : result.winner === 'B'
                      ? `${result.product_b.brand || ''} ${result.product_b.name || 'Product B'}`
                      : result.winner === 'tie'
                      ? 'It is a Healthy Tie!'
                      : 'Undetermined (Incompatible Bases or Trade-Offs)'}
                  </h3>
                </div>

                {/* WhatsApp Share Shortcut */}
                <a
                  href={getWhatsAppShareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer self-start md:self-auto"
                >
                  <Share2 className="w-4 h-4 stroke-[2.5]" /> Share on WhatsApp
                </a>
              </div>

              <div>
                <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${
                  result.winner === 'undetermined' ? 'text-amber-400' : 'text-emerald-400'
                }`}>Personalized Health Rationale</p>
                <p className="text-zinc-200 text-sm leading-relaxed font-medium md:text-base select-text">
                  {result.winner_reason}
                </p>
              </div>
            </div>

            {/* CONCRETE FACTUAL DIFFERENCES TABLE */}
            {result.concrete_differences && result.concrete_differences.length > 0 && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
                <div className="flex justify-between items-baseline mb-4">
                  <h3 className="text-base font-black text-white">Concrete Factual Differences</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Strict Same-Basis Math</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.concrete_differences.map((diff, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-850 bg-zinc-900/40 p-3.5 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                          {diff.nutrient}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-white font-bold">A: {diff.valA}{diff.unit}</span>
                          <span className="text-zinc-600">vs</span>
                          <span className="text-xs text-white font-bold">B: {diff.valB}{diff.unit}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-medium mt-2">
                        {diff.interpretation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SIDE-BY-SIDE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Product A Card */}
              <div className={`bg-zinc-950 border rounded-3xl p-6 relative overflow-hidden transition ${
                result.winner === 'A' ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-zinc-900'
              }`}>
                {result.winner === 'A' && (
                  <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                    Winner 🏆
                  </div>
                )}
                
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Product A</span>
                <h4 className="text-xl font-black text-white mt-1.5">{result.product_a.brand || 'Product A'}</h4>
                <p className="text-zinc-450 text-xs truncate mb-2">{result.product_a.name || 'Food Item'}</p>
                {result.product_a.pack_size && (
                  <span className="text-[10px] text-zinc-500 font-mono block mb-4">
                    Pack: {result.product_a.pack_size}
                  </span>
                )}

                <div className="flex items-center gap-4 mb-6">
                  {/* Score badge */}
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-black ${
                    result.product_a.safety_level === 'safe'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : result.product_a.safety_level === 'moderate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : result.product_a.safety_level === 'danger'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-zinc-800/40 text-zinc-300 border-zinc-700/50'
                  }`}>
                    <span className="text-[10px] uppercase font-bold leading-none mb-1 text-zinc-500">Score</span>
                    <span className="text-2xl leading-none">{result.product_a.health_score != null ? result.product_a.health_score : '--'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-500 mb-1">Safety Level</span>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                      result.product_a.safety_level === 'safe'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : result.product_a.safety_level === 'moderate'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : result.product_a.safety_level === 'danger'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-zinc-800/40 text-zinc-300 border-zinc-700/50'
                    }`}>
                      {result.product_a.safety_level === 'insufficient_evidence' ? 'Unrated' : result.product_a.safety_level}
                    </span>
                  </div>
                </div>

                {/* Dietary Alerts for Product A */}
                {result.product_a.dietary_alerts && result.product_a.dietary_alerts.length > 0 && (
                  <div className="mb-4 space-y-1.5 border-t border-zinc-900 pt-3">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 block">
                      Dietary Safety Warnings:
                    </span>
                    {result.product_a.dietary_alerts.map((al, idx) => (
                      <p key={idx} className="text-xs text-rose-300/90 leading-tight">
                        • <strong>{al.preference_label}:</strong> {al.explanation}
                      </p>
                    ))}
                  </div>
                )}

                <div className="h-[1px] bg-zinc-900 my-4" />
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-3">Highlights</p>
                <ul className="space-y-2">
                  {result.product_a.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-zinc-350 flex items-start gap-2 select-text">
                      <div className="w-1.5 h-1.5 rounded bg-zinc-500 shrink-0 mt-1.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Product B Card */}
              <div className={`bg-zinc-950 border rounded-3xl p-6 relative overflow-hidden transition ${
                result.winner === 'B' ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'border-zinc-900'
              }`}>
                {result.winner === 'B' && (
                  <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                    Winner 🏆
                  </div>
                )}
                
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Product B</span>
                <h4 className="text-xl font-black text-white mt-1.5">{result.product_b.brand || 'Product B'}</h4>
                <p className="text-zinc-450 text-xs truncate mb-2">{result.product_b.name || 'Food Item'}</p>
                {result.product_b.pack_size && (
                  <span className="text-[10px] text-zinc-500 font-mono block mb-4">
                    Pack: {result.product_b.pack_size}
                  </span>
                )}

                <div className="flex items-center gap-4 mb-6">
                  {/* Score badge */}
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-black ${
                    result.product_b.safety_level === 'safe'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : result.product_b.safety_level === 'moderate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : result.product_b.safety_level === 'danger'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-zinc-800/40 text-zinc-300 border-zinc-700/50'
                  }`}>
                    <span className="text-[10px] uppercase font-bold leading-none mb-1 text-zinc-500">Score</span>
                    <span className="text-2xl leading-none">{result.product_b.health_score != null ? result.product_b.health_score : '--'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-500 mb-1">Safety Level</span>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                      result.product_b.safety_level === 'safe'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : result.product_b.safety_level === 'moderate'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : result.product_b.safety_level === 'danger'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-zinc-800/40 text-zinc-300 border-zinc-700/50'
                    }`}>
                      {result.product_b.safety_level === 'insufficient_evidence' ? 'Unrated' : result.product_b.safety_level}
                    </span>
                  </div>
                </div>

                {/* Dietary Alerts for Product B */}
                {result.product_b.dietary_alerts && result.product_b.dietary_alerts.length > 0 && (
                  <div className="mb-4 space-y-1.5 border-t border-zinc-900 pt-3">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 block">
                      Dietary Safety Warnings:
                    </span>
                    {result.product_b.dietary_alerts.map((al, idx) => (
                      <p key={idx} className="text-xs text-rose-300/90 leading-tight">
                        • <strong>{al.preference_label}:</strong> {al.explanation}
                      </p>
                    ))}
                  </div>
                )}

                <div className="h-[1px] bg-zinc-900 my-4" />
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-3">Highlights</p>
                <ul className="space-y-2">
                  {result.product_b.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-zinc-350 flex items-start gap-2 select-text">
                      <div className="w-1.5 h-1.5 rounded bg-zinc-500 shrink-0 mt-1.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* HEAD-TO-HEAD COMPARISON TABLE */}
            {result.comparison_table && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
                <div className="flex justify-between items-baseline mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white">Head-to-Head Nutrition Comparison</h3>
                    {result.comparison_table.basis && (
                      <span className="text-xs text-zinc-400 font-medium">Standardized Basis: {result.comparison_table.basis}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Missing = Unknown (Not 0)
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-black tracking-wider">
                        <th className="pb-3 pr-2">Nutritional Field</th>
                        <th className="pb-3 px-2">Product A ({result.product_a.brand || 'Product A'})</th>
                        <th className="pb-3 pl-2">Product B ({result.product_b.brand || 'Product B'})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result.comparison_table)
                        .filter(([field]) => !['basis', 'basis_a', 'basis_b'].includes(field))
                        .map(([field, values]: any) => (
                          <tr key={field} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 transition select-text">
                            <td className="py-4 pr-2 font-bold text-zinc-400 capitalize">{field.replace('_', ' ')}</td>
                            <td className="py-4 px-2 font-medium text-white">{values?.a ?? <span className="text-zinc-500 italic">Unknown</span>}</td>
                            <td className="py-4 pl-2 font-medium text-white">{values?.b ?? <span className="text-zinc-500 italic">Unknown</span>}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HINDI & ENGLISH AI VERDICTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 select-text">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2">Final Verdict (English)</p>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {result.verdict_english}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 select-text">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-2">अंतिम निर्णय (Hindi Verdict)</p>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {result.verdict_hindi}
                </p>
              </div>

            </div>

          </section>
        )}

      </main>
    </div>
  )
}
