'use client'

import React from 'react'

export interface NutritionFacts {
  serving_size?: string | null
  panel_status?: 'extracted' | 'unreadable' | 'missing'
  unreadable_reason?: string | null
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

interface NutritionTableProps {
  nutrition?: NutritionFacts | null
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
  } = nutrition || {}

  const parseVal = (str?: string | null): number => {
    if (!str) return 0
    const val = parseFloat(str.replace(/[^0-9.]/g, ''))
    return isNaN(val) ? 0 : val
  }

  const get100gVal = (valStr?: string | null, val100gStr?: string | null): string => {
    if (val100gStr && val100gStr !== 'N/A') return val100gStr
    if (!valStr || valStr === 'N/A') return 'N/A'
    
    if (serving_size && serving_size !== 'N/A') {
      const servingMatch = serving_size.match(/(\d+(?:\.\d+)?)\s*(g|gm|grams?|ml|milliliters?)/i)
      if (servingMatch) {
        const servingWeight = parseFloat(servingMatch[1])
        if (servingWeight > 0) {
          const valNum = parseFloat(valStr.replace(/[^0-9.]/g, ''))
          if (!isNaN(valNum)) {
            const estimated = (valNum / servingWeight) * 100
            const unitMatch = valStr.match(/[a-zA-Z]+$/)
            const unit = unitMatch ? unitMatch[0] : ''
            return `${estimated.toFixed(1).replace(/\.0$/, '')}${unit}`
          }
        }
      }
    }
    return 'N/A'
  }

  const get100gCalories = (): string => {
    if (calories_100g !== undefined && calories_100g !== null) return `${calories_100g}`
    if (calories === undefined || calories === null) return 'N/A'
    
    if (serving_size && serving_size !== 'N/A') {
      const servingMatch = serving_size.match(/(\d+(?:\.\d+)?)\s*(g|gm|grams?|ml|milliliters?)/i)
      if (servingMatch) {
        const servingWeight = parseFloat(servingMatch[1])
        if (servingWeight > 0) {
          const estimated = (calories / servingWeight) * 100
          return `${Math.round(estimated)}`
        }
      }
    }
    return 'N/A'
  }

  const rows = [
    { label: 'Total Fat', value: fat || 'N/A', value100g: fat_100g || 'N/A', parsed: parseVal(fat), dailyLimit: 65, unit: 'g', indent: false },
    { label: 'Saturated Fat', value: saturated_fat || 'N/A', value100g: saturated_fat_100g || 'N/A', parsed: parseVal(saturated_fat), dailyLimit: 20, unit: 'g', indent: true },
    { label: 'Trans Fat', value: trans_fat || 'N/A', value100g: trans_fat_100g || 'N/A', parsed: parseVal(trans_fat), dailyLimit: 2, unit: 'g', indent: true },
    { label: 'Cholesterol', value: cholesterol || 'N/A', value100g: cholesterol_100g || 'N/A', parsed: parseVal(cholesterol), dailyLimit: 300, unit: 'mg', indent: false },
    { label: 'Sodium', value: sodium || 'N/A', value100g: sodium_100g || 'N/A', parsed: parseVal(sodium), dailyLimit: 2400, unit: 'mg', indent: false },
    { label: 'Total Carbohydrate', value: carbs || 'N/A', value100g: carbs_100g || 'N/A', parsed: parseVal(carbs), dailyLimit: 300, unit: 'g', indent: false },
    { label: 'Dietary Fiber', value: fiber || 'N/A', value100g: fiber_100g || 'N/A', parsed: parseVal(fiber), dailyLimit: 25, unit: 'g', indent: true },
    { label: 'Sugars', value: sugar || 'N/A', value100g: sugar_100g || 'N/A', parsed: parseVal(sugar), dailyLimit: 50, unit: 'g', indent: true },
    { label: 'Protein', value: protein || 'N/A', value100g: protein_100g || 'N/A', parsed: parseVal(protein), dailyLimit: 50, unit: 'g', indent: false },
  ]

  const calcDV = (row: typeof rows[0]) => {
    if (row.value === 'N/A' || row.value === '0' || row.value === '0g' || row.value === '0mg') return 0
    const dv = Math.round((row.parsed / row.dailyLimit) * 100)
    return Math.min(dv, 200)
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 font-sans text-white">
      <div className="border-b-8 border-white pb-1.5">
        <h2 className="text-3xl font-black uppercase tracking-tight leading-none">Nutrition Facts</h2>
        <p className="text-[10px] text-zinc-400 font-semibold mt-1">AI-extracted food profile analytics</p>
      </div>

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
            {calories !== undefined && calories !== null ? calories : 'N/A'}
          </span>
          {calories !== undefined && calories !== null && (
            <span className="text-[10px] font-bold text-zinc-400 block mt-1">
              Per 100g: {get100gCalories()} kcal
            </span>
          )}
        </div>
      </div>

      {/* Table Column Headers: Serving, 100g, and % DV */}
      <div className="flex justify-between items-center py-2 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        <span>Nutrient</span>
        <div className="flex items-center gap-4 text-right">
          <span className="w-16 text-right">Serving</span>
          <span className="w-16 text-right">Per 100g</span>
          <span className="w-12 text-right">% DV*</span>
        </div>
      </div>

      {/* Nutrient Rows */}
      <div className="flex flex-col">
        {rows.map((row, idx) => {
          const val100g = get100gVal(row.value, row.value100g)
          const dv = calcDV(row)
          const isNotAvailable = row.value === 'N/A'
          
          return (
            <div key={idx} className="border-b border-zinc-850/80 py-2.5">
              <div className="flex justify-between items-center text-sm">
                {/* Left: Nutrient Name */}
                <div className={`flex items-center min-w-0 ${row.indent ? 'pl-3' : 'font-bold'}`}>
                  {row.indent && <span className="text-zinc-500 mr-1.5 text-xs">↳</span>}
                  <span className={`${row.indent ? 'text-zinc-300 font-normal' : 'text-white font-bold'} truncate`}>
                    {row.label}
                  </span>
                </div>

                {/* Right: Serving, Per 100g, and % Daily Value */}
                <div className="flex items-center gap-4 text-right shrink-0">
                  <span className="w-16 text-right text-xs font-semibold text-zinc-200">
                    {isNotAvailable ? '—' : row.value}
                  </span>
                  <span className="w-16 text-right text-xs font-semibold text-emerald-400">
                    {val100g !== 'N/A' ? val100g : '—'}
                  </span>
                  <span className="w-12 text-right text-xs font-bold text-white">
                    {isNotAvailable ? '—' : (dv > 0 ? `${dv}%` : '0%')}
                  </span>
                </div>
              </div>

              {/* Visual Daily Value Bar */}
              {!isNotAvailable && dv > 0 && (
                <div className="mt-1.5 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
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

      <div className="pt-3 text-[10px] text-zinc-500 leading-tight">
        * Percent Daily Values are based on a 2,000 calorie diet.
      </div>
    </div>
  )
}
