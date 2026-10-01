'use client'

import React, { useState } from "react"
import { X, Send, AlertCircle, CheckCircle, RefreshCw, FileText } from "lucide-react"

interface NutritionValues {
  calories?: number | string
  sugar_g?: number | string
  added_sugar_g?: number | string
  fat_g?: number | string
  saturated_fat_g?: number | string
  sodium_mg?: number | string
  protein_g?: number | string
  fiber_g?: number | string
}

interface CorrectionModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  currentIngredients?: string[]
  currentNutrition?: {
    basis?: string
    serving_size?: string
    calories?: number | null
    sugar?: string | number | null
    added_sugar?: string | number | null
    fat?: string | number | null
    saturated_fat?: string | number | null
    sodium?: string | number | null
    protein?: string | number | null
    fiber?: string | number | null
  }
  onCorrectionSubmitted?: () => void
}

export function CorrectionModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentIngredients = [],
  currentNutrition,
  onCorrectionSubmitted
}: CorrectionModalProps) {
  const [activeSection, setActiveSection] = useState<"nutrition" | "ingredients">("nutrition")
  const [ingredientsText, setIngredientsText] = useState(currentIngredients.join(", "))
  
  // Parse numeric values safely
  const parseNum = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return ""
    const str = String(val).replace(/[^0-9.]/g, "")
    return str
  }

  const [nutrition, setNutrition] = useState<NutritionValues>({
    calories: parseNum(currentNutrition?.calories),
    sugar_g: parseNum(currentNutrition?.sugar),
    added_sugar_g: parseNum(currentNutrition?.added_sugar),
    fat_g: parseNum(currentNutrition?.fat),
    saturated_fat_g: parseNum(currentNutrition?.saturated_fat),
    sodium_mg: parseNum(currentNutrition?.sodium),
    protein_g: parseNum(currentNutrition?.protein),
    fiber_g: parseNum(currentNutrition?.fiber)
  })

  const [nutritionBasis, setNutritionBasis] = useState(currentNutrition?.basis || "per_100g")
  const [servingSize, setServingSize] = useState(currentNutrition?.serving_size || "")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleNutritionChange = (field: keyof NutritionValues, val: string) => {
    // Only permit non-negative decimal numbers
    if (val !== "" && !/^\d*\.?\d*$/.test(val)) return
    setNutrition(prev => ({ ...prev, [field]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const payload: {
        product_id: string
        product_name: string
        field_name: string
        original_value: any
        corrected_value: any
        notes?: string
      } = {
        product_id: productId || "unregistered_product",
        product_name: productName,
        field_name: activeSection === "nutrition" ? "nutrition_facts" : "ingredients",
        original_value: activeSection === "nutrition" ? currentNutrition : currentIngredients,
        corrected_value:
          activeSection === "nutrition"
            ? {
                basis: nutritionBasis,
                serving_size: servingSize,
                calories: nutrition.calories !== "" ? Number(nutrition.calories) : null,
                sugar_g: nutrition.sugar_g !== "" ? Number(nutrition.sugar_g) : null,
                added_sugar_g: nutrition.added_sugar_g !== "" ? Number(nutrition.added_sugar_g) : null,
                fat_g: nutrition.fat_g !== "" ? Number(nutrition.fat_g) : null,
                saturated_fat_g: nutrition.saturated_fat_g !== "" ? Number(nutrition.saturated_fat_g) : null,
                sodium_mg: nutrition.sodium_mg !== "" ? Number(nutrition.sodium_mg) : null,
                protein_g: nutrition.protein_g !== "" ? Number(nutrition.protein_g) : null,
                fiber_g: nutrition.fiber_g !== "" ? Number(nutrition.fiber_g) : null
              }
            : ingredientsText.split(",").map(i => i.trim()).filter(Boolean),
        notes: notes.trim() || undefined
      }

      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit correction")
      }

      setSubmitSuccess(true)
      setTimeout(() => {
        if (onCorrectionSubmitted) onCorrectionSubmitted()
        onClose()
      }, 1800)
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while submitting.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-850 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Community Provenance
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                0 Credits
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Suggest Label Correction
            </h2>
            <p className="text-xs text-zinc-400 truncate max-w-md">
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h3 className="text-base font-bold text-white">Correction Submitted!</h3>
            <p className="text-xs text-zinc-400 max-w-md">
              Your submission has been queued for human reviewer verification against original packaging photos. Thank you for making ScanSafe trustworthy!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3 text-xs text-blue-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong>Integrity Policy:</strong> Corrections are stored separately in the review queue with your provenance. Shared product records are never silently overwritten without reviewer verification against original package photos.
              </div>
            </div>

            {/* Toggle Sections */}
            <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveSection("nutrition")}
                className={`flex-1 py-2 font-bold rounded-md transition ${
                  activeSection === "nutrition"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Nutrition Facts
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("ingredients")}
                className={`flex-1 py-2 font-bold rounded-md transition ${
                  activeSection === "ingredients"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Ingredients Text
              </button>
            </div>

            {activeSection === "nutrition" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                      Basis
                    </label>
                    <select
                      value={nutritionBasis}
                      onChange={e => setNutritionBasis(e.target.value)}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="per_100g">Per 100g (Solid Standard)</option>
                      <option value="per_100ml">Per 100ml (Liquid Standard)</option>
                      <option value="per_serving">Per Serving (Disclosed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                      Serving Size (e.g. 30g, 200ml)
                    </label>
                    <input
                      type="text"
                      value={servingSize}
                      onChange={e => setServingSize(e.target.value)}
                      placeholder="e.g. 30g"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Calories (kcal)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.calories}
                      onChange={e => handleNutritionChange("calories", e.target.value)}
                      placeholder="e.g. 350"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Total Sugar (g)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.sugar_g}
                      onChange={e => handleNutritionChange("sugar_g", e.target.value)}
                      placeholder="e.g. 12"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Added Sugar (g)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.added_sugar_g}
                      onChange={e => handleNutritionChange("added_sugar_g", e.target.value)}
                      placeholder="e.g. 8"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Total Fat (g)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.fat_g}
                      onChange={e => handleNutritionChange("fat_g", e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Saturated Fat (g)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.saturated_fat_g}
                      onChange={e => handleNutritionChange("saturated_fat_g", e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Sodium (mg)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.sodium_mg}
                      onChange={e => handleNutritionChange("sodium_mg", e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.protein_g}
                      onChange={e => handleNutritionChange("protein_g", e.target.value)}
                      placeholder="e.g. 8"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">
                      Dietary Fiber (g)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition.fiber_g}
                      onChange={e => handleNutritionChange("fiber_g", e.target.value)}
                      placeholder="e.g. 3"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  Ingredients List (Comma-Separated as Declared on Package)
                </label>
                <textarea
                  rows={5}
                  value={ingredientsText}
                  onChange={e => setIngredientsText(e.target.value)}
                  placeholder="Wheat Flour, Sugar, Palm Oil, Cocoa Powder..."
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Correction Notes / Package Evidence
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Total sugars was misread as 25g instead of 2.5g on 2026 packaging."
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-rose-950/40 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-850">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Submit Correction (0 Credits)
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
