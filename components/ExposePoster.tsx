import React, { forwardRef } from 'react'
import { AlertTriangle, ShieldAlert, Zap, CheckCircle2 } from 'lucide-react'
import { IngredientAnalysisResult } from './ResultCard'

interface ExposePosterProps {
  result: IngredientAnalysisResult
}

export const ExposePoster = forwardRef<HTMLDivElement, ExposePosterProps>(({ result }, ref) => {
  const { product_name, health_score, ingredients = [], alternatives_detailed = [] } = result

  // Get the most dangerous ingredients
  const toxicIngredients = ingredients.filter(i => i.status === 'avoid' || i.status === 'caution').slice(0, 3)
  
  // Get alternatives
  const alternatives = alternatives_detailed.slice(0, 2)

  return (
    // We use fixed positioning underneath the main content to avoid html-to-image rendering bugs on iOS/Safari (opacity: 0 or moving offscreen completely breaks it)
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: -50, pointerEvents: 'none' }}>
      <div 
        ref={ref} 
        id="expose-poster-node"
        className="w-[1080px] h-[1080px] bg-black text-white p-12 flex flex-col justify-between"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Background Accents */}
        <div className="absolute inset-0 bg-rose-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-rose-600/10 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/10 blur-[100px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3" />

        {/* Header */}
        <div className="relative z-10 flex gap-8 items-center border-b border-zinc-800 pb-8">
           <div className="flex items-center justify-center w-32 h-32 rounded-3xl bg-rose-500 text-black font-black text-6xl shadow-[0_0_50px_rgba(244,63,94,0.4)] shrink-0">
             {health_score}
           </div>
           <div className="min-w-0">
              <p className="text-3xl font-black text-rose-500 tracking-widest uppercase mb-1">Health Score</p>
              <h1 className="text-6xl font-black leading-tight tracking-tight text-white truncate max-w-[800px]">
                {product_name}
              </h1>
           </div>
        </div>

        {/* Middle Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center gap-8 my-8">
          {toxicIngredients.length > 0 && (
            <div className="bg-zinc-950/80 border-l-8 border-rose-500 rounded-r-3xl p-8 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-4 mb-6">
                <ShieldAlert className="w-10 h-10 text-rose-500" />
                <h3 className="text-4xl font-black text-rose-400">AVOID:</h3>
              </div>
              
              <div className="flex flex-col gap-5">
                {toxicIngredients.map((ing, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="mt-1 flex-shrink-0">
                      <AlertTriangle className="w-8 h-8 text-rose-500" />
                    </div>
                    <div>
                      <h4 className="text-3xl font-bold text-white">{ing.name}</h4>
                      <p className="text-2xl text-zinc-400 mt-1 leading-snug">{ing.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {alternatives.length > 0 && (
             <div className="bg-emerald-950/20 border-l-8 border-emerald-500 rounded-r-3xl p-8 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-4 mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <h3 className="text-4xl font-black text-emerald-400">SAFER ALTERNATIVES:</h3>
              </div>
              
              <div className="flex flex-col gap-5">
                {alternatives.map((alt, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="mt-1 flex-shrink-0">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-3xl font-bold text-white">{alt.name} <span className="text-zinc-500 font-medium">by {alt.brand}</span></h4>
                      <p className="text-2xl text-emerald-200/80 mt-1 leading-snug">{alt.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-zinc-800">
          <p className="text-2xl text-zinc-500 font-bold uppercase tracking-widest">Check your pantry. Stay safe.</p>
          <div className="flex items-center gap-4 bg-zinc-900 px-8 py-4 rounded-full border border-zinc-800">
            <Zap className="w-8 h-8 text-emerald-400" />
            <div className="text-right">
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Scanned With</p>
              <p className="text-3xl font-black text-white tracking-wide">ScanSafe <span className="text-emerald-400">Ultra</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

ExposePoster.displayName = 'ExposePoster'
