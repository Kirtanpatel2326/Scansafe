'use client'

import React, { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import {
  VIRAL_PRODUCT_PRESETS,
  generateViralAd,
  ViralAdPackage,
  ProductPreset,
  StoryboardStep
} from '@/lib/ad-generator'
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Share2,
  Video,
  Smartphone,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  Zap,
  ShoppingBag,
  ExternalLink,
  Layers,
  FileText,
  Send,
  Radio,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react'

export default function ViralAdsStudioPage() {
  const [selectedPreset, setSelectedPreset] = useState<ProductPreset>(VIRAL_PRODUCT_PRESETS[0])
  const [adPackage, setAdPackage] = useState<ViralAdPackage>(() =>
    generateViralAd(
      VIRAL_PRODUCT_PRESETS[0].name,
      VIRAL_PRODUCT_PRESETS[0].ingredients,
      VIRAL_PRODUCT_PRESETS[0].frontClaims,
      VIRAL_PRODUCT_PRESETS[0].healthScore,
      VIRAL_PRODUCT_PRESETS[0].category
    )
  )

  // Custom Input State
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customIngredients, setCustomIngredients] = useState('')
  const [customFrontClaims, setCustomFrontClaims] = useState('')
  const [customScore, setCustomScore] = useState(30)
  const [selectedLang, setSelectedLang] = useState('en')

  // Video Simulator State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Auto-Publishing State
  const [selectedPlatforms, setSelectedPlatforms] = useState<Array<'instagram' | 'youtube'>>(['instagram', 'youtube'])
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState<any[] | null>(null)
  const [publishStatusMessage, setPublishStatusMessage] = useState<string | null>(null)

  const togglePlatform = (p: 'instagram' | 'youtube') => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const handlePublishReel = async () => {
    if (selectedPlatforms.length === 0) return
    setIsPublishing(true)
    setPublishResults(null)
    setPublishStatusMessage(null)

    try {
      const res = await fetch('/api/ads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: adPackage.id,
          title: `${adPackage.productName} Truth Exposed! #Shorts`,
          caption: adPackage.socialPost.caption,
          platforms: selectedPlatforms,
          webhookUrl: webhookUrl.trim() || undefined,
          hashtags: adPackage.socialPost.hashtags,
          manyChatTrigger: adPackage.socialPost.manyChatAutomationTrigger
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger publishing pipeline')
      }

      setPublishResults(data.results || [])
      setPublishStatusMessage(data.message || data.summary || 'Publishing dispatched successfully!')
    } catch (err: any) {
      setPublishStatusMessage(err.message || 'Publishing error')
    } finally {
      setIsPublishing(false)
    }
  }

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Regenerate ad package when preset changes
  const handleSelectPreset = (preset: ProductPreset) => {
    setSelectedPreset(preset)
    setIsCustomMode(false)
    const pkg = generateViralAd(
      preset.name,
      preset.ingredients,
      preset.frontClaims,
      preset.healthScore,
      preset.category,
      selectedLang
    )
    setAdPackage(pkg)
    resetPlayback()
  }

  // Handle Custom Generation
  const handleGenerateCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim()) return
    const ings = customIngredients
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const claims = customFrontClaims
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const pkg = generateViralAd(
      customName,
      ings.length > 0 ? ings : ['Refined Flour', 'Palm Oil', 'Sugar'],
      claims.length > 0 ? claims : ['Healthy Choice'],
      customScore,
      'Snacks',
      selectedLang
    )
    setAdPackage(pkg)
    resetPlayback()
  }

  // Sync Video Simulator Timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 0.1
          if (next >= adPackage.durationSeconds) {
            setIsPlaying(false)
            return 0
          }
          return next
        })
      }, 100)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, adPackage.durationSeconds])

  // Update current step based on currentTime
  useEffect(() => {
    const stepIdx = adPackage.storyboard.findIndex(
      s => currentTime >= s.secondsStart && currentTime < s.secondsEnd
    )
    if (stepIdx >= 0) {
      setCurrentStepIndex(stepIdx)
    }
  }, [currentTime, adPackage.storyboard])

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false)
      audioRef.current?.pause()
    } else {
      setIsPlaying(true)
      audioRef.current?.play().catch(e => console.log('Audio autoplay prevented:', e))
    }
  }

  const resetPlayback = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentStepIndex(0)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const activeStep: StoryboardStep = adPackage.storyboard[currentStepIndex] || adPackage.storyboard[0]

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* HERO TITLE */}
        <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-black p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automated Viral Marketing Engine</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Viral Ad & Short-Form Video Studio
              </h1>
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                Generate 15-second high-retention video ads on autopilot. Powered by ScanSafe's Chemical Synergy Engine, Greenwashing Exposer, and ManyChat comment automation.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                Format: 9:16 Vertical Reel
              </span>
            </div>
          </div>
        </div>

        {/* PRESET PRODUCT CAROUSEL */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Select Trending Food Teardown Preset</span>
            </h2>
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
            >
              {isCustomMode ? '← Back to Presets' : '+ Custom Product Mode'}
            </button>
          </div>

          {!isCustomMode ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {VIRAL_PRODUCT_PRESETS.map(preset => {
                const isSelected = selectedPreset.id === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`rounded-2xl border p-3.5 text-left transition flex flex-col justify-between h-32 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/10'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <span className="text-2xl mb-1 block">{preset.emoji}</span>
                      <p className="text-xs font-bold text-white line-clamp-2 leading-tight">
                        {preset.name}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded self-start ${
                        preset.healthScore < 30
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      }`}
                    >
                      Score: {preset.healthScore}/100
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <form onSubmit={handleGenerateCustom} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Product Name (e.g. Real Honey Corn Flakes)"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
                  required
                />
                <input
                  placeholder="Front Claims comma-separated (e.g. 100% Real Honey, Whole Grain)"
                  value={customFrontClaims}
                  onChange={e => setCustomFrontClaims(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
                />
              </div>
              <textarea
                rows={2}
                placeholder="Ingredients comma-separated (e.g. Corn, Sugar, Invert Syrup, Malt Extract, Preservative 211)"
                value={customIngredients}
                onChange={e => setCustomIngredients(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-white"
              />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>Health Score Penalty:</span>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={customScore}
                    onChange={e => setCustomScore(Number(e.target.value))}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span className="font-mono text-white font-bold">{customScore}/100</span>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2 text-xs font-bold transition shadow-md"
                >
                  Generate Custom Viral Ad Package
                </button>
              </div>
            </form>
          )}
        </div>

        {/* STUDIO WORKSPACE: 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: INTERACTIVE PHONE REEL SIMULATOR (5 COLUMNS) */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-4">
            
            {/* PHONE SHELL */}
            <div className="relative w-full max-w-[340px] aspect-[9/16] rounded-[42px] border-4 border-zinc-700 bg-zinc-950 shadow-2xl p-3 flex flex-col justify-between overflow-hidden ring-1 ring-zinc-800">
              
              {/* TOP SPEAKER NOTCH */}
              <div className="absolute top-2 inset-x-0 flex justify-center z-20">
                <div className="h-4 w-28 bg-zinc-800 rounded-full" />
              </div>

              {/* SIMULATOR SCREEN CONTENT */}
              <div className="relative h-full w-full rounded-[32px] overflow-hidden bg-gradient-to-b from-zinc-900 via-black to-zinc-950 flex flex-col justify-between p-4 pt-8">
                
                {/* VIDEO TOP OVERLAYS */}
                <div className="flex items-center justify-between z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {activeStep.phase}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full">
                    {currentTime.toFixed(1)}s / {adPackage.durationSeconds}s
                  </span>
                </div>

                {/* CENTER VISUAL SIMULATOR STAGE */}
                <div className="flex-1 flex flex-col items-center justify-center text-center p-3 my-auto z-10 space-y-4">
                  {/* Dynamic Visual Stage Icon / Banner */}
                  {activeStep.phase === 'HOOK' && (
                    <div className="space-y-2 animate-bounce">
                      <span className="text-5xl">🚨</span>
                      <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">
                        {adPackage.productName}
                      </p>
                    </div>
                  )}

                  {activeStep.phase === 'PROBLEM' && (
                    <div className="space-y-2">
                      <span className="text-5xl">🔍</span>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Inspecting 6pt Micro-Label
                      </p>
                    </div>
                  )}

                  {activeStep.phase === 'SCAN_REVEAL' && (
                    <div className="relative w-28 h-28 border-2 border-dashed border-emerald-400 rounded-2xl flex items-center justify-center overflow-hidden bg-emerald-950/20">
                      <Smartphone className="w-12 h-12 text-emerald-400" />
                      {/* Laser scanning line */}
                      <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                    </div>
                  )}

                  {activeStep.phase === 'FINDINGS' && (
                    <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/60 space-y-1">
                      <span className="text-3xl font-black text-rose-400 font-mono">
                        {adPackage.healthScore}/100
                      </span>
                      <p className="text-[10px] uppercase font-bold text-rose-300">
                        {adPackage.topSynergy ? adPackage.topSynergy.title : 'High Processing Hazard'}
                      </p>
                    </div>
                  )}

                  {activeStep.phase === 'SMART_SWAP' && (
                    <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 space-y-1.5">
                      <span className="text-3xl">🥦</span>
                      <p className="text-xs font-bold text-emerald-300">
                        {adPackage.topSwap?.name || 'Clean Whole-Food Swap'}
                      </p>
                      <span className="text-[9px] uppercase font-bold text-black bg-emerald-400 px-2 py-0.5 rounded-full inline-block">
                        1-Click Buy on Blinkit
                      </span>
                    </div>
                  )}

                  {activeStep.phase === 'CTA' && (
                    <div className="space-y-2">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 animate-pulse">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-black uppercase text-white tracking-wider">
                        ManyChat Auto-DM Trigger
                      </p>
                    </div>
                  )}

                  {/* HORMOZI-STYLE BOLD ANIMATED TEXT OVERLAY */}
                  <div
                    className={`px-3 py-1.5 rounded-xl font-black text-base sm:text-lg tracking-wide uppercase shadow-2xl transition-all duration-300 ${
                      activeStep.overlayColor === 'red'
                        ? 'bg-rose-600 text-white shadow-rose-600/40'
                        : activeStep.overlayColor === 'emerald'
                        ? 'bg-emerald-500 text-black shadow-emerald-500/40'
                        : 'bg-white text-black shadow-white/40'
                    }`}
                  >
                    {activeStep.textOverlay}
                  </div>
                </div>

                {/* BOTTOM CAPTION STREAM */}
                <div className="bg-black/80 backdrop-blur-md rounded-2xl p-3 border border-zinc-800 space-y-1 z-10 text-left">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                    Voiceover Cue:
                  </span>
                  <p className="text-xs text-zinc-200 leading-snug line-clamp-3 italic">
                    "{activeStep.voiceover}"
                  </p>
                </div>
              </div>

              {/* TIMELINE PROGRESS BAR */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-100"
                  style={{ width: `${(currentTime / adPackage.durationSeconds) * 100}%` }}
                />
              </div>
            </div>

            {/* SIMULATOR CONTROLS */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Ad Preview'}</span>
              </button>

              <button
                onClick={resetPlayback}
                className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
                title="Restart Preview"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>

              <audio
                ref={audioRef}
                src={adPackage.audioTtsUrl}
                muted={isMuted}
                onEnded={resetPlayback}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: PRODUCTION TOOLKIT & STORYBOARD (7 COLUMNS) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ACTION TOOLBAR: 1-CLICK COPIES */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Video className="w-4 h-4 text-emerald-400" />
                <span>Ready-To-Publish Reel Package</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => copyToClipboard(adPackage.voiceoverFullText, 'script')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 text-xs font-bold transition"
                >
                  {copiedKey === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Script</span>
                </button>

                <button
                  onClick={() => copyToClipboard(adPackage.socialPost.caption, 'caption')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 text-xs font-bold transition"
                >
                  {copiedKey === 'caption' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Caption & Tags</span>
                </button>

                <a
                  href={adPackage.audioTtsUrl}
                  download="scansafe_voiceover.mp3"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 text-xs font-bold transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Download Audio (.mp3)</span>
                </a>
              </div>
            </div>

            {/* FULL STORYBOARD TIMELINE */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>15-Second Step-By-Step Storyboard</span>
              </h3>

              <div className="space-y-2.5">
                {adPackage.storyboard.map((step, idx) => {
                  const isActive = currentStepIndex === idx
                  return (
                    <div
                      key={step.id}
                      onClick={() => {
                        setCurrentTime(step.secondsStart)
                        setCurrentStepIndex(idx)
                      }}
                      className={`rounded-2xl border p-4 transition cursor-pointer ${
                        isActive
                          ? 'border-emerald-500/80 bg-zinc-900 shadow-md ring-1 ring-emerald-500/50'
                          : 'border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold font-mono ${
                              isActive ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white uppercase">{step.phase}</span>
                            <span className="text-[11px] font-mono text-zinc-500 ml-2">({step.timestamp})</span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            step.overlayColor === 'red'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : step.overlayColor === 'emerald'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {step.textOverlay}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5 text-xs">
                        <p className="text-zinc-200">
                          <strong className="text-zinc-400 font-normal">Voiceover: </strong>
                          "{step.voiceover}"
                        </p>
                        <p className="text-[11px] text-zinc-400 flex items-start gap-1">
                          <span className="text-emerald-400">🎥</span>
                          <span>{step.visualCue}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* MANYCHAT COMMENT-TO-DM VIRAL BLUEPRINT */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>ManyChat Comment Automation Rule</span>
                </h4>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                  Active Growth Loop
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                When users comment <strong className="text-emerald-400">"SCAN"</strong> on your Reel/Short, ManyChat automatically sends this private direct message within 2 seconds:
              </p>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 space-y-2">
                <p className="text-emerald-400 font-bold">👉 Instant DM Sent to User:</p>
                <p className="text-[11px] text-zinc-200">
                  "Hey! Here is the free link to scan any food packaging directly from your camera: https://scansafe.co.in 🥦 Try scanning a snack in your kitchen and let me know your score!"
                </p>
              </div>
            </div>

            {/* 1-CLICK AUTONOMOUS CROSS-PLATFORM PUBLISHER */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">1-Click Auto-Publish & Schedule</h4>
                    <p className="text-[11px] text-zinc-400">Instagram Reels • YouTube Shorts • 24/7 Autonomous Bot</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
                  24/7 Cloud Ready
                </span>
              </div>

              {/* PLATFORM SELECTORS */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">Target Platforms:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlatform('instagram')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                      selectedPlatforms.includes('instagram')
                        ? 'bg-gradient-to-r from-fuchsia-950/40 to-rose-950/40 border-fuchsia-500/60 text-fuchsia-200 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">📸</span>
                      <span>Instagram Reels</span>
                    </div>
                    {selectedPlatforms.includes('instagram') ? (
                      <CheckCircle2 className="w-4 h-4 text-fuchsia-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlatform('youtube')}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                      selectedPlatforms.includes('youtube')
                        ? 'bg-gradient-to-r from-red-950/40 to-orange-950/40 border-red-500/60 text-red-200 shadow-sm'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">▶️</span>
                      <span>YouTube Shorts</span>
                    </div>
                    {selectedPlatforms.includes('youtube') ? (
                      <CheckCircle2 className="w-4 h-4 text-red-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700" />
                    )}
                  </button>
                </div>
              </div>

              {/* OPTIONAL WEBHOOK BRIDGE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Zero-Token Webhook Bridge (Optional):</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">Zapier / Make / Ayrshare</span>
                </div>
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/hooks/catch/... (or leave empty)"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                />
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Connects directly to your social accounts with zero complex app reviews.
                </p>
              </div>

              {/* PUBLISH ACTION BUTTON */}
              <button
                type="button"
                onClick={handlePublishReel}
                disabled={isPublishing || selectedPlatforms.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-extrabold text-sm py-3 px-4 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Transcoding & Dispatching to Platforms...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-black" />
                    <span>Publish Reel Now to {selectedPlatforms.length} Platform{selectedPlatforms.length === 1 ? '' : 's'}</span>
                  </>
                )}
              </button>

              {/* LIVE PUBLISH RESULTS FEEDBACK */}
              {publishStatusMessage && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                    <span>Dispatch Status:</span>
                    <span className="text-emerald-400">{publishStatusMessage}</span>
                  </div>

                  {publishResults && publishResults.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {publishResults.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 text-xs border border-zinc-800/80"
                        >
                          <div className="flex items-center gap-2">
                            {r.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            )}
                            <span className="font-bold text-white capitalize">{r.platform}:</span>
                            <span className="text-zinc-400 text-[11px] truncate max-w-[220px]">{r.message}</span>
                          </div>

                          {r.postUrl && (
                            <a
                              href={r.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 24/7 GITHUB ACTIONS CRON INFO */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-[11px] text-zinc-400 flex items-start gap-2">
                <Radio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong>24/7 Cloud Bot Active:</strong> Configured in <code className="text-emerald-300 bg-zinc-950 px-1 py-0.5 rounded">.github/workflows/scansafe_auto_reels.yml</code> to run on a daily cron schedule completely hands-free.
                </p>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
