'use client'

import React from 'react'

export interface NutritionFacts {
  serving_size?: string
  calories?: number
  calories_100g?: number
  fat?: string
  fat_100g?: string
  saturated_fat?: string
  saturated_fat_100g?: string
  trans_fat?: string
  trans_fat_100g?: string
  cholesterol?: string
  cholesterol_100g?: string
  sodium?: string
  sodium_100g?: string
  carbs?: string
  carbs_100g?: string
  fiber?: string
  fiber_100g?: string
  sugar?: string
  sugar_100g?: string
  protein?: string
  protein_100g?: string
}

interface NutritionTableProps {
  nutrition: NutritionFacts
}

export default function NutritionTable({ nutrition }: NutritionTableProps) {
  const {
    serving_size = 'N/A',
    calories,
    calories_100g,
    fat = 'N/A',
    fat_100g = 'N/A',
    saturated_fat = 'N/A',
    saturated_fat_100g = 'N/A',
    trans_fat = 'N/A',
    trans_fat_100g = 'N/A',
    cholesterol = 'N/A',
    cholesterol_100g = 'N/A',
    sodium = 'N/A',
    sodium_100g = 'N/A',
    carbs = 'N/A',
    carbs_100g = 'N/A',
    fiber = 'N/A',
    fiber_100g = 'N/A',
    sugar = 'N/A',
    sugar_100g = 'N/A',
    protein = 'N/A',
    protein_100g = 'N/A',
  } = nutrition

  // Helper to parse numeric values from strings (e.g., "15g" -> 15, "120mg" -> 120)
  const parseVal = (str: string): number => {
    const val = parseFloat(str.replace(/[^0-9.]/g, ''))
    return isNaN(val) ? 0 : val
  }

  // Estimate per 100g if missing, based on serving size weight in grams
  const get100gVal = (valStr: string, val100gStr?: string): string => {
    if (val100gStr && val100gStr !== 'N/A') return val100gStr
    if (!valStr || valStr === 'N/A') return 'N/A'
    
    // Parse serving size weight (e.g. "30g" -> 30, "1 can (355 ml)" -> 355)
    const servingMatch = serving_size.match(/(\d+(?:\.\d+)?)\s*(g|ml|gm)/i)
    if (servingMatch) {
      const servingWeight = parseFloat(servingMatch[1])
      if (servingWeight > 0) {
        const valNum = parseFloat(valStr.replace(/[^0-9.]/g, ''))
        if (!isNaN(valNum)) {
          const estimated = (valNum / servingWeight) * 100
          // Keep unit (g or mg)
          const unitMatch = valStr.match(/[a-zA-Z]+$/)
          const unit = unitMatch ? unitMatch[0] : ''
          return `${estimated.toFixed(1).replace(/\.0$/, '')}${unit}`
        }
      }
    }
    return 'N/A'
  }

  const get100gCalories = (): string => {
    if (calories_100g !== undefined) return `${calories_100g}`
    if (calories === undefined) return 'N/A'
    
    const servingMatch = serving_size.match(/(\d+(?:\.\d+)?)\s*(g|ml|gm)/i)
    if (servingMatch) {
      const servingWeight = parseFloat(servingMatch[1])
      if (servingWeight > 0) {
        const estimated = (calories / servingWeight) * 100
        return `${Math.round(estimated)}`
      }
    }
    return 'N/A'
  }

  // Define macro rows for listing
  const rows = [
    { label: 'Total Fat', value: fat, value100g: fat_100g, parsed: parseVal(fat), dailyLimit: 65, unit: 'g', indent: false },
    { label: 'Saturated Fat', value: saturated_fat, value100g: saturated_fat_100g, parsed: parseVal(saturated_fat), dailyLimit: 20, unit: 'g', indent: true },
    { label: 'Trans Fat', value: trans_fat, value100g: trans_fat_100g, parsed: parseVal(trans_fat), dailyLimit: 2, unit: 'g', indent: true },
    { label: 'Cholesterol', value: cholesterol, value100g: cholesterol_100g, parsed: parseVal(cholesterol), dailyLimit: 300, unit: 'mg', indent: false },
    { label: 'Sodium', value: sodium, value100g: sodium_100g, parsed: parseVal(sodium), dailyLimit: 2400, unit: 'mg', indent: false },
    { label: 'Total Carbohydrate', value: carbs, value100g: carbs_100g, parsed: parseVal(carbs), dailyLimit: 300, unit: 'g', indent: false },
    { label: 'Dietary Fiber', value: fiber, value100g: fiber_100g, parsed: parseVal(fiber), dailyLimit: 25, unit: 'g', indent: true },
    { label: 'Sugars', value: sugar, value100g: sugar_100g, parsed: parseVal(sugar), dailyLimit: 50, unit: 'g', indent: true },
    { label: 'Protein', value: protein, value100g: protein_100g, parsed: parseVal(protein), dailyLimit: 50, unit: 'g', indent: false },
  ]

  // Calculate percentage of daily value (rough estimates)
  const calcDV = (row: typeof rows[0]) => {
    if (row.value === 'N/A' || row.value === '0' || row.value === '0g' || row.value === '0mg') return 0
    const dv = Math.round((row.parsed / row.dailyLimit) * 100)
    return Math.min(dv, 200) // cap visual display at 200%
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 font-sans text-white">
      {/* Table Header */}
      <div className="border-b-8 border-white pb-1.5">
        <h2 className="text-3xl font-black uppercase tracking-tight leading-none">Nutrition Facts</h2>
        <p className="text-[10px] text-zinc-400 font-semibold mt-1">AI-extracted food profile analytics</p>
      </div>

      {/* Calories Block */}
      <div className="flex justify-between items-baseline py-2.5 border-b-4 border-white">
        <div>
          <span className="text-sm font-black">Amount per serving</span>
          <h3 className="text-3xl font-black uppercase tracking-tight leading-none mt-1">Calories</h3>
          {serving_size && serving_size !== 'N/A' && (
            <span className="text-[10px] text-zinc-400 font-semibold block mt-1">
              Serving: {serving_size}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-4xl font-black tracking-tight leading-none block">
            {calories !== undefined ? calories : 'N/A'}
          </span>
          {calories !== undefined && (
            <span className="text-[10px] font-bold text-zinc-400 block mt-1">
              Per 100g: {get100gCalories()} kcal
            </span>
          )}
        </div>
      </div>

      {/* DV Note */}
      <div className="text-right py-1.5 border-b border-zinc-850">
        <span className="text-[10px] font-bold text-zinc-400">% Daily Value*</span>
      </div>

      {/* Nutrient Rows */}
      <div className="flex flex-col">
        {rows.map((row, idx) => {
          const val100g = get100gVal(row.value, row.value100g)
          const dv = calcDV(row)
          const isNotAvailable = row.value === 'N/A'
          
          return (
            <div key={idx} className="border-b border-zinc-850 py-2.5">
              <div className="flex justify-between items-center text-sm">
                {/* Left Side: Nutrient Label */}
                <div className={`${row.indent ? 'pl-4' : 'font-extrabold'}`}>
                  {row.label}
                </div>

                {/* Right Side: Serving, 100g, and Daily Value side-by-side */}
                <div className="flex items-baseline gap-4 text-right">
                  {!isNotAvailable && (
                    <span className="text-zinc-100 font-extrabold text-xs">
                      {row.value}
                    </span>
                  )}
                  {!isNotAvailable && val100g !== 'N/A' && val100g !== '-' && (
                    <span className="text-zinc-100 font-extrabold text-xs lowercase">
                      {val100g}/100g
                    </span>
                  )}
                  <span className="font-extrabold text-xs min-w-[32px] text-right text-white">
                    {isNotAvailable ? '-' : (dv > 0 ? `${dv}%` : '0%')}
                  </span>
                </div>
              </div>

              {/* Progress bar representing DV */}
              {!isNotAvailable && dv > 0 && (
                <div className="mt-1.5 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      row.label === 'Sugars' || row.label === 'Saturated Fat' || row.label === 'Sodium'
                        ? dv > 25
                          ? 'bg-rose-500'
                          : 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(dv, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer disclaimer */}
      <div className="mt-4 border-t-8 border-white pt-2 text-[9px] leading-relaxed text-zinc-500 font-medium">
        * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice. Values are extracted using Claude OCR / Open Food Facts and may vary based on label quality.
      </div>
    </div>
  )
}
