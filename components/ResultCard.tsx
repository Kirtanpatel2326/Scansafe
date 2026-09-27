'use client'

import React, { useState, useRef, useEffect } from "react"
import { toPng } from "html-to-image"
import { ExposePoster } from "./ExposePoster"
import { 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Check, 
  FileText, 
  Activity,
  Volume2,
  Square,
  Camera,
  ArrowLeft,
  Share2,
  Info
} from "lucide-react"

export interface IngredientAnalysisResult {
  id?: string
  product_name: string
  brand: string
  health_score: number
  health_score_reason?: string
  safety_level: "safe" | "moderate" | "danger"
  description: string
  image_url?: string
  image?: string
  panel_status?: "extracted" | "unreadable" | "missing"
  unreadable_instructions?: string
  is_sample?: boolean
  ingredients: Array<{
    name: string
    status: "safe" | "caution" | "avoid"
    reason: string
  }>
  additives: Array<{
    name: string
    code?: string
    risk: "low" | "medium" | "high"
    description: string
    source?: string
  }>
  allergens: string[]
  allergens_declared?: string[]
  recommendations: string[]
  nutrition_facts?: {
    panel_status?: "extracted" | "unreadable" | "missing"
    unreadable_reason?: string | null
    serving_size?: string | null
    per_serving?: {
      calories?: number | null
      fat_g?: number | null
      saturated_fat_g?: number | null
      trans_fat_g?: number | null
      cholesterol_mg?: number | null
      sodium_mg?: number | null
      carbs_g?: number | null
      fiber_g?: number | null
      sugar_g?: number | null
      added_sugar_g?: number | null
      protein_g?: number | null
    }
    per_100g?: {
      calories?: number | null
      fat_g?: number | null
      saturated_fat_g?: number | null
      trans_fat_g?: number | null
      cholesterol_mg?: number | null
      sodium_mg?: number | null
      carbs_g?: number | null
      fiber_g?: number | null
      sugar_g?: number | null
      added_sugar_g?: number | null
      protein_g?: number | null
    }
    calories?: number | null
    calories_100g?: number | null
    fat?: string | null
    fat_100g?: string | null
    saturated_fat?: string | null
    saturated_fat_100g?: string | null
    trans_fat?: string | null
    trans_fat_100g?: string | null
    cholesterol?: string | null
    cholesterol_100g?: string | null
    sodium?: string | null
    sodium_100g?: string | null
    carbs?: string | null
    carbs_100g?: string | null
    fiber?: string | null
    fiber_100g?: string | null
    sugar?: string | null
    sugar_100g?: string | null
    protein?: string | null
    protein_100g?: string | null
  }
  alternatives_detailed?: Array<{
    name: string
    brand: string
    reason: string
    estimated_price_inr?: number
    buy_url_blinkit?: string
    buy_url_bigbasket?: string
  }>
  upf_score?: number
  upf_reason?: string
  glycemic_index_estimate?: "low" | "medium" | "high"
  glycemic_reason?: string
  dietary_compatibility?: {
    is_compatible: boolean
    matched_preferences: string[]
    violations: Array<{
      preference: string
      ingredient: string
      reason: string
    }>
    allergen_warnings: string[]
  }
}

interface ResultCardProps {
  result: IngredientAnalysisResult
  scanId?: string
  imageUrl?: string | null
  onScanAnother?: () => void
}

export default function ResultCard({ result, scanId, imageUrl, onScanAnother }: ResultCardProps) {
  const [activeTab, setActiveTab] = useState<"ingredients" | "additives" | "nutrition" | "alternatives">("ingredients")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false)
  const [pregeneratedFile, setPregeneratedFile] = useState<File | null>(null)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const posterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause()
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [audio])

  const {
    product_name,
    brand,
    health_score,
    health_score_reason,
    safety_level,
    description,
    ingredients = [],
    additives = [],
    allergens = [],
    recommendations = [],
    alternatives_detailed = [],
    upf_score = 3,
    upf_reason,
    glycemic_index_estimate = "medium",
    glycemic_reason,
    nutrition_facts,
    panel_status = "extracted",
    unreadable_instructions,
    dietary_compatibility,
    is_sample
  } = result

  const reportId = scanId || result.id

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400 stroke-emerald-400"
    if (score >= 40) return "text-amber-400 stroke-amber-400"
    return "text-rose-500 stroke-rose-500"
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-emerald-500/10 border-emerald-500/20"
    if (score >= 40) return "bg-amber-500/10 border-amber-500/20"
    return "bg-rose-500/10 border-rose-500/20"
  }

  const safetyConfig = {
    safe: {
      colorClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      text: "Nutritionally Favorable"
    },
    moderate: {
      colorClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      text: "Moderate Health Impact"
    },
    danger: {
      colorClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      text: "High Health Concern"
    }
  }

  const currentSafety = safetyConfig[safety_level] || safetyConfig.moderate

  const statusConfig = {
    safe: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    caution: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    avoid: "bg-rose-500/10 text-rose-400 border-rose-500/20"
  }

  const riskConfig = {
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    high: "bg-rose-500/10 text-rose-400 border-rose-500/20"
  }

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (health_score / 100) * circumference

  const handleListen = () => {
    if (isSpeaking) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
      setIsSpeaking(false)
      return
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const textToSpeak = `${product_name || "This product"} scored ${health_score} out of 100. ${health_score_reason || description || ""}`
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.rate = 1.0
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  const generatePosterFile = async (): Promise<File | null> => {
    if (!posterRef.current) return null
    try {
      setIsGeneratingPoster(true)
      const dataUrl = await toPng(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 1080,
        height: 1080,
      })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const safeName = (product_name || "Product").replace(/[^a-zA-Z0-9]/g, "_")
      const file = new File([blob], `${safeName}_Breakdown.png`, { type: "image/png" })
      setPregeneratedFile(file)
      setIsGeneratingPoster(false)
      return file
    } catch (e) {
      console.error("Poster generation error:", e)
      setIsGeneratingPoster(false)
      return null
    }
  }

  const handleShare = async () => {
    let file = pregeneratedFile
    if (!file) {
      file = await generatePosterFile()
    }
    if (!file) {
      alert("Could not generate image breakdown. Please try again.")
      return
    }

    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `ScanSafe Health Breakdown: ${product_name || "Product"}`,
          text: `Health analysis for ${product_name || "this product"}: Score ${health_score}/100.`,
          files: [file]
        })
      } else {
        const link = document.createElement("a")
        link.download = file.name
        link.href = URL.createObjectURL(file)
        link.click()
      }
    } catch (err) {
      console.error("Share error:", err)
    }
  }

  const finalImageUrl = imageUrl || result.image_url || result.image || null

  return (
    <div className="flex flex-col gap-6 relative">
      <ExposePoster ref={posterRef} result={result} />

      {/* Sample / Demo Mode Banner */}
      {is_sample && (
        <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-4 flex items-center justify-between gap-3 text-indigo-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">
              SAMPLE BREAKDOWN — INTERACTIVE DEMO MODE (0 Credits Used)
            </span>
          </div>
          <span className="text-[10px] font-black uppercase bg-indigo-500 text-black px-2 py-0.5 rounded">
            Demo
          </span>
        </div>
      )}

      {/* Unreadable / Missing Panel Alert */}
      {panel_status !== "extracted" && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 flex items-start gap-3 text-amber-200">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              {panel_status === "unreadable" ? "Nutrition Panel Was Partially Unreadable" : "Nutrition Panel Not Detected in Photo"}
            </h4>
            <p className="text-xs text-amber-400/90 mt-1 leading-relaxed">
              {unreadable_instructions || "For high-precision macro auditing, please capture the ingredients and nutrition table under direct lighting without glare."}
            </p>
          </div>
        </div>
      )}

      {/* Dietary Profile Compatibility Banner */}
      {dietary_compatibility && !dietary_compatibility.is_compatible && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Dietary Preference Alert
          </div>
          <div className="space-y-1 pl-7">
            {dietary_compatibility.violations.map((v, i) => (
              <p key={i} className="text-xs text-rose-300/90 leading-relaxed">
                • <span className="font-bold underline">{v.ingredient}</span>: violates your <span className="font-bold">{v.preference}</span> preference ({v.reason})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Product Summary Header Card */}
      <div className={`rounded-2xl border p-6 md:p-8 ${getScoreBg(health_score)} transition duration-300`}>
        <div className="flex flex-col gap-6">
          {/* Top Row: Gauge + Title/Brand + Scanned Image */}
          <div className="flex flex-col sm:flex-row gap-6 items-start justify-between">
            <div className="flex flex-col sm:flex-row flex-1 gap-5 items-start sm:items-center min-w-0">
              {/* SVG Circular Gauge */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-zinc-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className={`transition-all duration-1000 ease-out ${getScoreColor(health_score).split(" ")[1]}`}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white">{health_score}</span>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Score</span>
                </div>
              </div>

              {/* Title / Brand */}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {brand || "Unbranded"}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-white mt-0.5 leading-snug">
                  {product_name || "Food Product"}
                </h2>
                {/* Safety Badge & PDF */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${currentSafety.colorClass}`}>
                    {currentSafety.icon}
                    {currentSafety.text}
                  </div>
                  {reportId && !is_sample && (
                    <a
                      href={`/api/export-pdf?scanId=${reportId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-zinc-350 hover:bg-zinc-900 hover:text-white transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" /> Export PDF
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Scanned Image (Right Side) */}
            {finalImageUrl && (
              <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl border border-zinc-700/60 overflow-hidden shadow-2xl relative group bg-zinc-900 self-center sm:self-start">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
                <img 
                  src={finalImageUrl} 
                  alt={product_name || "Scanned Product"} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  onError={(e) => {
                    const el = (e.target as HTMLElement).closest(".group");
                    if (el) (el as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold text-white shadow-sm z-20">
                  <Camera className="w-3 h-3" /> Scanned
                </div>
              </div>
            )}
          </div>

          {/* Middle Row: Health Reason Highlight & Detailed Description */}
          <div className="space-y-3 pt-2">
            {health_score_reason && (
              <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 flex items-start gap-2.5">
                <Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p id="tts-health-reason" className="text-xs sm:text-sm font-semibold text-zinc-200 leading-relaxed">
                  {health_score_reason}
                </p>
              </div>
            )}
            <p id="tts-description" className="text-zinc-300 text-sm leading-relaxed">
              {description || "This product was analyzed by ScanSafe Food Intelligence."}
            </p>
          </div>

          {/* Bottom Row: Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={handleShare}
              disabled={isGeneratingPoster}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
            >
              {isGeneratingPoster ? (
                <span className="animate-pulse">Generating Summary...</span>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-white" /> Share Health Breakdown
                </>
              )}
            </button>
            <button 
              onClick={handleListen}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition shadow-lg active:scale-95 ${
                isSpeaking 
                  ? "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20" 
                  : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
              }`}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> Stop Audio
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" /> Listen
                </>
              )}
            </button>
            {onScanAnother && (
              <button 
                onClick={onScanAnother}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition shadow-lg active:scale-95 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800"
              >
                <ArrowLeft className="w-4 h-4" /> Scan Another
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Declared Allergens Warning */}
      {allergens.length > 0 && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Declared Allergens</h4>
            <p id="tts-allergens" className="text-rose-400/90 text-xs mt-1">
              Declared on label: <span className="font-bold underline">{allergens.join(", ")}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Detail Tabs */}
      <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-850 bg-zinc-950/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("ingredients")}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === "ingredients"
                ? "border-emerald-500 text-emerald-400 bg-zinc-900/10"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Ingredients ({ingredients.length})
          </button>
          <button
            onClick={() => setActiveTab("additives")}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === "additives"
                ? "border-emerald-500 text-emerald-400 bg-zinc-900/10"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Additives ({additives.length})
          </button>
          <button
            onClick={() => setActiveTab("nutrition")}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === "nutrition"
                ? "border-emerald-500 text-emerald-400 bg-zinc-900/10"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Nutrition & Science
          </button>
          <button
            onClick={() => setActiveTab("alternatives")}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === "alternatives"
                ? "border-emerald-500 text-emerald-400 bg-zinc-900/10"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            Clean Swaps ({alternatives_detailed.length || recommendations.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === "ingredients" && (
            <div className="flex flex-col gap-3">
              {ingredients.length > 0 ? (
                ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-850 bg-zinc-950/20 p-4 sm:grid-cols-[220px_100px_1fr] sm:items-center sm:gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-zinc-200 text-sm truncate" title={ing.name}>
                        {ing.name}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider min-w-[75px] text-center ${statusConfig[ing.status]}`}>
                        {ing.status}
                      </span>
                    </div>

                    <div className="min-w-0">
                      {ing.reason && (
                        <p className="text-zinc-400 text-xs leading-relaxed">
                          {ing.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-center py-6 text-sm">No ingredients extracted.</p>
              )}
            </div>
          )}

          {activeTab === "additives" && (
            <div className="flex flex-col gap-4">
              {additives.length > 0 ? (
                additives.map((add, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-zinc-850 bg-zinc-950/20 p-4 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-100 text-sm">{add.name}</span>
                        {add.code && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                            {add.code}
                          </span>
                        )}
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${riskConfig[add.risk]}`}>
                        {add.risk} Risk
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed pl-1">
                      {add.description}
                    </p>
                    {add.source && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1 pl-1">
                        <Activity className="w-3 h-3 text-emerald-400" /> Scientific Source: {add.source}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                  <h4 className="text-sm font-bold text-white">Additive-Free Product</h4>
                  <p className="text-zinc-500 text-xs mt-1">This product contains no recognized chemical stabilizers or artificial additives.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "nutrition" && (
            <div className="flex flex-col gap-6">
              {/* Scientific Indexes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Processing Index</span>
                  <h4 className="text-base font-black text-white">NOVA Group {upf_score}</h4>
                  <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                    {upf_reason || (upf_score === 4 
                      ? "Ultra-processed industrial formulation with cosmetic additives and refined ingredients."
                      : upf_score === 3
                      ? "Processed food formulation combining whole foods with basic culinary ingredients."
                      : "Minimally processed whole food.")}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Glycemic Impact</span>
                  <h4 className="text-base font-black text-white">Glycemic Load: <span className="capitalize">{glycemic_index_estimate}</span></h4>
                  <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                    {glycemic_reason || "Estimated glycemic absorption based on dietary fiber and simple sugar content."}
                  </p>
                </div>
              </div>

              {/* Nutrition Facts Table */}
              {nutrition_facts && (
                <div className="rounded-xl border border-zinc-850 bg-zinc-950/20 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Nutrition Facts {nutrition_facts.serving_size ? `(${nutrition_facts.serving_size})` : ""}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Per 100g / Serving
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Calories</span>
                      <span className="font-bold text-white">{nutrition_facts.calories_100g || nutrition_facts.calories || "—"} kcal</span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Total Sugar</span>
                      <span className="font-bold text-white">{nutrition_facts.sugar_100g || nutrition_facts.sugar || "—"}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Total Fat</span>
                      <span className="font-bold text-white">{nutrition_facts.fat_100g || nutrition_facts.fat || "—"}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Protein</span>
                      <span className="font-bold text-white">{nutrition_facts.protein_100g || nutrition_facts.protein || "—"}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Sodium</span>
                      <span className="font-bold text-white">{nutrition_facts.sodium_100g || nutrition_facts.sodium || "—"}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Dietary Fiber</span>
                      <span className="font-bold text-white">{nutrition_facts.fiber_100g || nutrition_facts.fiber || "—"}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Saturated Fat</span>
                      <span className="font-bold text-white">{nutrition_facts.saturated_fat_100g || nutrition_facts.saturated_fat || "—"}</span>
                    </div>
                    <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                      <span className="text-zinc-500 block text-[10px]">Trans Fat</span>
                      <span className="font-bold text-white">{nutrition_facts.trans_fat_100g || nutrition_facts.trans_fat || "—"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "alternatives" && (
            <div className="flex flex-col gap-4">
              {alternatives_detailed.length > 0 ? (
                alternatives_detailed.map((alt, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 text-sm">{alt.name}</span>
                        <span className="text-[10px] text-zinc-500">by {alt.brand}</span>
                      </div>
                      <p className="text-zinc-350 text-xs mt-1 leading-relaxed max-w-xl">
                        {alt.reason}
                      </p>
                    </div>

                    {alt.estimated_price_inr && (
                      <span className="text-white font-black text-sm shrink-0">
                        ₹{alt.estimated_price_inr} <span className="text-[10px] text-zinc-500 font-normal">est.</span>
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col gap-3">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 items-start bg-zinc-950/10 border border-zinc-850 rounded-xl p-4"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <p className="text-zinc-300 text-sm leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
