'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { SAMPLE_PRODUCTS, applyPreferences, IngredientAnalysis } from '@/lib/claude'
import ResultCard from '@/components/ResultCard'
import { AlertTriangle, ArrowRight, RefreshCw, CheckCircle, Info, Filter } from 'lucide-react'

export default function GuestDemoPage() {
  const [selectedKey, setSelectedKey] = useState<'sample_cookies' | 'sample_oats'>('sample_cookies')
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const baseProduct = SAMPLE_PRODUCTS[selectedKey]
  const currentAnalysis: IngredientAnalysis = applyPreferences(baseProduct, selectedAllergies)

  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies(prev => 
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    )
  }

  const handleSimulateRescan = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* DEMO MODE BANNER - REQUIRED FORMAT */}
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-black px-2.5 py-0.5 rounded-full">
                    SAMPLE DATA — DEMO MODE
                  </span>
                  <span className="text-xs text-amber-300 font-semibold hidden md:inline">
                    Zero Credits • No Sign-In Required
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 mt-1.5 leading-relaxed">
                  You are viewing deterministic sample food label fixtures. No credits are debited, no third-party vision calls are executed, and no data is written to user history.
                </p>
              </div>
            </div>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200 transition shrink-0"
            >
              Sign In for Live Scanning <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* SAMPLE SELECTOR & CONTROLS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Sample Product 1 */}
          <button
            onClick={() => setSelectedKey('sample_cookies')}
            className={`p-5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedKey === 'sample_cookies'
                ? 'border-emerald-500 bg-zinc-900/90 shadow-md ring-1 ring-emerald-500/40'
                : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Sample 1: Ultra-Processed Confectionery</span>
                {selectedKey === 'sample_cookies' && (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>
              <h3 className="text-base font-bold text-white">Lotte Choco Pie</h3>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Multi-ingredient sweet snack with hydrogenated palm fats, high added sugars, and synthetic emulsifiers.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
              <span className="text-rose-400 font-bold">Score: 24/100</span> • <span>NOVA 4 Ultra-Processed</span>
            </div>
          </button>

          {/* Sample Product 2 */}
          <button
            onClick={() => setSelectedKey('sample_oats')}
            className={`p-5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedKey === 'sample_oats'
                ? 'border-emerald-500 bg-zinc-900/90 shadow-md ring-1 ring-emerald-500/40'
                : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Sample 2: Clean Single-Ingredient Whole Grain</span>
                {selectedKey === 'sample_oats' && (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>
              <h3 className="text-base font-bold text-white">Quaker Rolled Oats 100% Whole Grain</h3>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                Single-ingredient 100% whole grain rolled oats with high beta-glucan soluble fiber, zero added sugar, and no additives.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
              <span className="text-emerald-400 font-bold">Score: 95/100</span> • <span>NOVA 1 Whole Grain</span>
            </div>
          </button>
        </div>

        {/* INTERACTIVE DEMO PREFERENCE SIMULATOR */}
        <div className="mb-8 rounded-2xl border border-zinc-850 bg-zinc-950/50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>Simulate User Dietary Profiles (Client-Side Filtering)</span>
            </div>
            <button
              onClick={handleSimulateRescan}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition font-medium cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              Reset View
            </button>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            Toggle allergens below to see how ScanSafe customizes allergen warnings and dietary compatibility without altering neutral base scores:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'gluten', label: 'Gluten / Wheat' },
              { id: 'milk', label: 'Dairy / Milk' },
              { id: 'soy', label: 'Soy' },
              { id: 'vegan', label: 'Vegan' },
              { id: 'diabetic', label: 'Diabetic Friendly' }
            ].map(tag => {
              const active = selectedAllergies.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleAllergy(tag.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    active
                      ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {active ? `✓ Flags ${tag.label}` : `+ Flag ${tag.label}`}
                </button>
              )
            })}
          </div>
        </div>

        {/* RESULT CARD DISPLAY */}
        <div className="flex flex-col gap-6">
          <div className="w-full">
            <ResultCard
              result={currentAnalysis as any}
              scanId="sample_demo_id"
              onScanAnother={handleSimulateRescan}
            />
          </div>

          {/* ACCURACY & ESTIMATE NOTICE */}
          <div className="rounded-xl border border-zinc-850 bg-zinc-950 p-4 text-xs text-zinc-400 leading-relaxed flex items-start gap-3">
            <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-zinc-300">Nutrition Estimate Notice:</span> ScanSafe evaluates packaged-food labels to understand listed ingredients and nutrition facts. Scores are nutritional estimates based on visible label declarations, not certifications of chemical purity, food safety, or medical suitability. AI can misread damaged or blurry labels; review all extracted text.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
