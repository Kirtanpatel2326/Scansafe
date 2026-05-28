'use client'

import React, { useState } from 'react'
import { 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  Check, 
  FileText, 
  HelpCircle, 
  Activity, 
  ShoppingCart, 
  Trees, 
  Heart,
  Droplet
} from 'lucide-react'

export interface IngredientAnalysisResult {
  id?: string
  product_name: string
  brand: string
  health_score: number
  safety_level: 'safe' | 'moderate' | 'danger'
  description: string
  ingredients: Array<{
    name: string
    status: 'safe' | 'caution' | 'avoid'
    reason: string
  }>
  additives: Array<{
    name: string
    code?: string
    risk: 'low' | 'medium' | 'high'
    description: string
    source?: string
  }>
  allergens: string[]
  recommendations: string[]
  nutrition_facts?: {
    calories?: number
    fat?: string
    saturated_fat?: string
    trans_fat?: string
    cholesterol?: string
    sodium?: string
    carbs?: string
    fiber?: string
    sugar?: string
    protein?: string
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
  microplastics_risk?: 'low' | 'medium' | 'high'
  microplastics_reason?: string
  sustainability_grade?: 'A' | 'B' | 'C' | 'D' | 'E'
  sustainability_reason?: string
  glycemic_index_estimate?: 'low' | 'medium' | 'high'
  glycemic_reason?: string
  health_risk_breakdown?: {
    heart?: 'low' | 'medium' | 'high'
    diabetes?: 'low' | 'medium' | 'high'
    inflammation?: 'low' | 'medium' | 'high'
    gut_health?: 'low' | 'medium' | 'high'
  }
}

interface ResultCardProps {
  result: IngredientAnalysisResult
  scanId?: string
}

export default function ResultCard({ result, scanId }: ResultCardProps) {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'additives' | 'toxicity' | 'alternatives'>('ingredients')

  const {
    product_name,
    brand,
    health_score,
    safety_level,
    description,
    ingredients = [],
    additives = [],
    allergens = [],
    recommendations = [],
    alternatives_detailed = [],
    upf_score = 3,
    microplastics_risk = 'medium',
    microplastics_reason = 'Multilayer packaging wrapper.',
    sustainability_grade = 'C',
    sustainability_reason = 'Estimated packaging footprint.',
    glycemic_index_estimate = 'medium',
    glycemic_reason = 'Sugar absorption indices.',
    health_risk_breakdown = { heart: 'medium', diabetes: 'medium', inflammation: 'medium', gut_health: 'medium' }
  } = result

  const reportId = scanId || result.id

  // Health Score color coding
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400 stroke-emerald-400'
    if (score >= 40) return 'text-amber-400 stroke-amber-400'
    return 'text-rose-500 stroke-rose-500'
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-500/10 border-emerald-500/20'
    if (score >= 40) return 'bg-amber-500/10 border-amber-500/20'
    return 'bg-rose-500/10 border-rose-500/20'
  }

  // Safety level helpers
  const safetyDetails = {
    safe: {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      text: 'Safe & Clean',
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    moderate: {
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      text: 'Moderate Caution',
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    danger: {
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      text: 'High Risk / Avoid',
      colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
  }

  const currentSafety = safetyDetails[safety_level] || safetyDetails.moderate

  // Ingredient status pill styling
  const statusConfig = {
    safe: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    caution: 'bg-amber-500/10 text-amber-400 border-emerald-500/20',
    avoid: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }

  // Additive risk badge
  const riskConfig = {
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/10',
    high: 'bg-rose-500/15 text-rose-400 border-rose-500/10',
  }

  // Risk breakdown values
  const riskColor = {
    low: 'text-emerald-400 bg-emerald-950/20 border-emerald-800/30',
    medium: 'text-amber-400 bg-amber-950/20 border-amber-800/30',
    high: 'text-rose-400 bg-rose-950/20 border-rose-800/30'
  }

  // Calculate SVG circular gauge variables
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (health_score / 100) * circumference

  return (
    <div className="flex flex-col gap-6">
      {/* Product Summary Header Card */}
      <div className={`rounded-2xl border p-6 ${getScoreBg(health_score)} transition duration-300`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 gap-4 items-center">
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
                  className={`transition-all duration-1000 ease-out ${getScoreColor(health_score).split(' ')[1]}`}
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
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {brand || 'Unbranded'}
              </span>
              <h2 className="text-xl font-bold text-white truncate mt-0.5">
                {product_name || 'Processed Product'}
              </h2>
              {/* Safety Badge */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${currentSafety.colorClass}`}>
                  {currentSafety.icon}
                  {currentSafety.text}
                </div>
                {reportId && (
                  <a
                    href={`/api/export-pdf?scanId=${reportId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-zinc-350 hover:bg-zinc-905 hover:text-white transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Export PDF
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="max-w-md lg:border-l lg:border-zinc-800/80 lg:pl-6">
            <p className="text-zinc-300 text-sm leading-relaxed">
              {description || 'This product was analyzed by ScanSafe Ultra. Review details below for potential warnings.'}
            </p>
          </div>
        </div>
      </div>

      {/* Allergens Warnings Block */}
      {allergens.length > 0 && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-300">Allergen Warning</h4>
            <p className="text-rose-400/90 text-xs mt-1">
              This product contains or may contain: <span className="font-bold underline">{allergens.join(', ')}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Detail Tabs */}
      <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-850 bg-zinc-950/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'ingredients'
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Ingredients ({ingredients.length})
          </button>
          <button
            onClick={() => setActiveTab('additives')}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'additives'
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Additives ({additives.length})
          </button>
          <button
            onClick={() => setActiveTab('toxicity')}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'toxicity'
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Toxicity & Risk
          </button>
          <button
            onClick={() => setActiveTab('alternatives')}
            className={`flex-1 min-w-[100px] py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'alternatives'
                ? 'border-emerald-500 text-emerald-400 bg-zinc-900/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Alternatives ({alternatives_detailed.length || recommendations.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === 'ingredients' && (
            /* Ingredients List */
            <div className="flex flex-col gap-3">
              {ingredients.length > 0 ? (
                ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-xl border border-zinc-850 bg-zinc-950/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-zinc-200 text-sm">{ing.name}</span>
                    </div>

                    <div className="flex items-center gap-3 pl-8 sm:pl-0">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusConfig[ing.status]}`}>
                        {ing.status}
                      </span>
                      {ing.reason && (
                        <p className="text-zinc-400 text-xs sm:max-w-xs md:max-w-md">
                          {ing.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500 text-center py-6 text-sm">No ingredients listed.</p>
              )}
            </div>
          )}

          {activeTab === 'additives' && (
            /* Additives List */
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
                        <Activity className="w-3 h-3 text-emerald-400" /> Source: {add.source}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
                  <h4 className="text-sm font-bold text-white">Additive-Free Product</h4>
                  <p className="text-zinc-500 text-xs mt-1">This product contains no recognized chemical additives or stabilizers!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'toxicity' && (
            /* Toxicity and Risk Breakdown Panel */
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* UPF Nova Rating */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Processing Index</span>
                  <h4 className="text-base font-black text-white flex items-center gap-1.5">
                    NOVA Group {upf_score}
                  </h4>
                  <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                    {upf_score === 4 
                      ? 'Ultra-processed food product containing synthesized stabilizers, sugars, and additives.'
                      : upf_score === 3 
                      ? 'Processed food product combining simple ingredients with moderate processing.'
                      : 'Unprocessed or minimally processed whole food product.'}
                  </p>
                </div>

                {/* Microplastics */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Packaging Contaminant</span>
                  <h4 className="text-base font-black text-white flex items-center gap-1.5">
                    Microplastics: <span className="capitalize">{microplastics_risk}</span>
                  </h4>
                  <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{microplastics_reason}</p>
                </div>

                {/* Glycemic Index */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Glycemic Load</span>
                  <h4 className="text-base font-black text-white flex items-center gap-1.5">
                    Sugar Spikes: <span className="capitalize">{glycemic_index_estimate}</span>
                  </h4>
                  <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{glycemic_reason}</p>
                </div>
              </div>

              {/* Long Term Risks */}
              <div className="rounded-xl border border-zinc-850 bg-zinc-950/10 p-5">
                <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Long-Term Systemic Risk Estimates
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(health_risk_breakdown).map(([riskType, riskVal]) => (
                    <div key={riskType} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3.5 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                        {riskType.replace('_', ' ')}
                      </span>
                      <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-widest ${riskColor[riskVal as 'low'|'medium'|'high'] || ''}`}>
                        {riskVal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sustainability */}
              <div className="rounded-xl border border-zinc-850 bg-zinc-950/10 p-4 flex gap-3.5 items-start">
                <Trees className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Sustainability Grade: {sustainability_grade}
                  </h4>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                    {sustainability_reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alternatives' && (
            /* Recommendations & Alternative Shopping Portal */
            <div className="flex flex-col gap-5">
              {alternatives_detailed.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Recommended Smart Alternatives (India Marketplace Focus)
                  </h4>
                  {alternatives_detailed.map((alt, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-950/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
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

                      <div className="flex flex-col gap-2 shrink-0 sm:items-end">
                        {alt.estimated_price_inr && (
                          <span className="text-white font-black text-sm">
                            ₹{alt.estimated_price_inr} <span className="text-[10px] text-zinc-500 font-normal">est.</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Simple recommendation fallback */
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
