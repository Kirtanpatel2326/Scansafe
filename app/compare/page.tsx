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
  Plus
} from 'lucide-react'
import Image from 'next/image'

interface ComparisonResult {
  winner: 'A' | 'B' | 'tie'
  winner_reason: string
  product_a: {
    name: string
    brand: string
    health_score: number
    safety_level: 'safe' | 'moderate' | 'danger'
    highlights: string[]
  }
  product_b: {
    name: string
    brand: string
    health_score: number
    safety_level: 'safe' | 'moderate' | 'danger'
    highlights: string[]
  }
  comparison_table: {
    calories: { a: string; b: string }
    sugar: { a: string; b: string }
    sodium: { a: string; b: string }
    protein: { a: string; b: string }
    fat: { a: string; b: string }
    fiber: { a: string; b: string }
    additives: { a: string; b: string }
    fssai_status: { a: string; b: string }
  }
  verdict_english: string
  verdict_hindi: string
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

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoadingSession(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

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
    if (target === 'A') setFileA(file)
    else setFileB(file)

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
      if (target === 'A') setImageA(dataUrl)
      else setImageB(dataUrl)
    }
    stopCamera()
  }

  const removePhoto = (target: 'A' | 'B') => {
    if (target === 'A') {
      setImageA(null)
      setFileA(null)
    } else {
      setImageB(null)
      setFileB(null)
    }
  }

  // Start Comparison API Call
  const handleCompare = async () => {
    if (!user) {
      router.push('/auth')
      return
    }

    if (!imageA || !imageB) {
      setErrorMsg('Please upload label images for both Product A and Product B.')
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
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          imageA,
          imageB,
          preferences: mappedPrefs,
          idempotencyKey
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Comparison failed to process.')
      }

      // Refresh compare op key for next comparison
      setCompareOpKey(typeof crypto !== 'undefined' && crypto.randomUUID ? `cmp_${crypto.randomUUID()}` : `cmp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
      setResult(data.comparison)
      // Scroll to result section
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
    const winProd = result.winner === 'A' ? result.product_a : result.product_b
    const loseProd = result.winner === 'A' ? result.product_b : result.product_a
    
    let text = `ScanSafe Comparison Alert! 🔍\n\n🏆 Winner: ${winProd.brand} ${winProd.name} (Score: ${winProd.health_score})\n❌ Alternate: ${loseProd.brand} ${loseProd.name} (Score: ${loseProd.health_score})\n\nReason: ${result.winner_reason}\n\nCompare your shopping cart items now at https://scansafe.co.in/compare`
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
      <style>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0.3; }
          50% { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 0.3; }
        }
      `}</style>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner Details */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-zinc-900">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              Side-by-Side <span className="text-emerald-400">Compare</span> <GitCompare className="w-6 h-6 text-emerald-400" />
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Select your health profile, upload details for two foods, and let AI analyze which is better for your body.
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

        {/* 2. DUAL UPLOADS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Product A */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black uppercase tracking-wider text-zinc-400">Product A (Label/Ingredients)</h4>
                {imageA && (
                  <button 
                    onClick={() => removePhoto('A')}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {imageA ? (
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
                <div className="border border-dashed border-zinc-800 rounded-2xl aspect-video flex flex-col items-center justify-center bg-zinc-950/40 p-6 text-center">
                  <Upload className="w-8 h-8 text-zinc-650 mb-3" />
                  <p className="text-xs text-zinc-400 font-semibold mb-4">Upload or snapshot Product A ingredients list</p>
                  
                  <div className="flex flex-wrap gap-3 justify-center">
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
                      <Camera className="w-4 h-4 text-emerald-400" /> Open Camera
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
                <h4 className="text-sm font-black uppercase tracking-wider text-zinc-400">Product B (Label/Ingredients)</h4>
                {imageB && (
                  <button 
                    onClick={() => removePhoto('B')}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>

              {imageB ? (
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
                <div className="border border-dashed border-zinc-800 rounded-2xl aspect-video flex flex-col items-center justify-center bg-zinc-950/40 p-6 text-center">
                  <Upload className="w-8 h-8 text-zinc-650 mb-3" />
                  <p className="text-xs text-zinc-400 font-semibold mb-4">Upload or snapshot Product B ingredients list</p>
                  
                  <div className="flex flex-wrap gap-3 justify-center">
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
                      <Camera className="w-4 h-4 text-emerald-400" /> Open Camera
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
                <GitCompare className="w-5 h-5" /> Compare These Products
              </>
            )}
          </button>
        </div>

        {/* 3. COMPARISON RESULTS BLOCK */}
        {result && (
          <section id="comparison-results" className="scroll-mt-6 flex flex-col gap-8 mb-16">
            
            {/* WINNER CONTAINER */}
            <div className="relative rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-black p-6 md:p-8 overflow-hidden shadow-xl shadow-emerald-500/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900/60 pb-5 mb-5">
                <div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider font-extrabold flex items-center gap-1.5 w-fit">
                    <Sparkles className="w-3.5 h-3.5 fill-emerald-400" /> Comparison Winner
                  </span>
                  <h3 className="text-2xl md:text-3xl font-black text-white mt-3">
                    {result.winner === 'A' 
                      ? `${result.product_a.brand} ${result.product_a.name}`
                      : result.winner === 'B'
                      ? `${result.product_b.brand} ${result.product_b.name}`
                      : 'It is a Healthy Tie!'}
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
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-wider mb-2 text-emerald-400">Personalized Health Rationale</p>
                <p className="text-zinc-200 text-sm leading-relaxed font-medium md:text-base select-text">
                  {result.winner_reason}
                </p>
              </div>
            </div>

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
                <h4 className="text-xl font-black text-white mt-1.5">{result.product_a.brand}</h4>
                <p className="text-zinc-450 text-xs truncate mb-5">{result.product_a.name}</p>

                <div className="flex items-center gap-4 mb-6">
                  {/* Score badge */}
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-black ${
                    result.product_a.safety_level === 'safe'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : result.product_a.safety_level === 'moderate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span className="text-[10px] uppercase font-bold leading-none mb-1 text-zinc-500">Score</span>
                    <span className="text-2xl leading-none">{result.product_a.health_score}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-500 mb-1">Safety Level</span>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                      result.product_a.safety_level === 'safe'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : result.product_a.safety_level === 'moderate'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {result.product_a.safety_level}
                    </span>
                  </div>
                </div>

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
                <h4 className="text-xl font-black text-white mt-1.5">{result.product_b.brand}</h4>
                <p className="text-zinc-450 text-xs truncate mb-5">{result.product_b.name}</p>

                <div className="flex items-center gap-4 mb-6">
                  {/* Score badge */}
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-black ${
                    result.product_b.safety_level === 'safe'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : result.product_b.safety_level === 'moderate'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    <span className="text-[10px] uppercase font-bold leading-none mb-1 text-zinc-500">Score</span>
                    <span className="text-2xl leading-none">{result.product_b.health_score}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-500 mb-1">Safety Level</span>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                      result.product_b.safety_level === 'safe'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : result.product_b.safety_level === 'moderate'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {result.product_b.safety_level}
                    </span>
                  </div>
                </div>

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
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
              <h3 className="text-lg font-black text-white mb-6">Head-to-Head Nutrition Comparison</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase font-black tracking-wider">
                      <th className="pb-3 pr-2">Nutritional Field</th>
                      <th className="pb-3 px-2">Product A ({result.product_a.brand})</th>
                      <th className="pb-3 pl-2">Product B ({result.product_b.brand})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.comparison_table).map(([field, values]: any) => (
                      <tr key={field} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 transition select-text">
                        <td className="py-4 pr-2 font-bold text-zinc-400 capitalize">{field.replace('_', ' ')}</td>
                        <td className="py-4 px-2 font-medium text-white">{values.a || 'N/A'}</td>
                        <td className="py-4 pl-2 font-medium text-white">{values.b || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
