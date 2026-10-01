'use client'

import React from "react"
import { X, Layers, ArrowRight, ShieldCheck, Clock, Package } from "lucide-react"

export interface ProductVariantItem {
  id: string
  product_name: string
  brand?: string
  variant?: string
  pack_size?: string
  review_status?: string
  last_reviewed_at?: string
  nutrition_basis?: string
  thumbnail_url?: string
}

interface VariantSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  query: string
  variants: ProductVariantItem[]
  onSelectVariant: (variant: ProductVariantItem) => void
}

export function VariantSelectorModal({
  isOpen,
  onClose,
  query,
  variants,
  onSelectVariant
}: VariantSelectorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-850 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Formulation Disambiguation
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
                {variants.length} Varieties Found
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Select Specific Product Variant
            </h2>
            <p className="text-xs text-zinc-400">
              Matches for &ldquo;{query}&rdquo;. Different sizes or flavors often have different recipes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variants List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {variants.map(item => (
            <button
              key={item.id}
              onClick={() => {
                onSelectVariant(item)
                onClose()
              }}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850/80 hover:border-emerald-500/50 p-4 transition group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white group-hover:text-emerald-300 transition truncate">
                      {item.product_name}
                    </span>
                    {item.variant && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                        {item.variant}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                    {item.brand && <span>{item.brand}</span>}
                    {item.pack_size && <span>• Pack: {item.pack_size}</span>}
                    {item.nutrition_basis && (
                      <span className="font-mono text-[10px] text-zinc-500">
                        • {item.nutrition_basis}
                      </span>
                    )}
                  </div>
                  {item.review_status === "reviewed" && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Reviewed Product Record</span>
                      {item.last_reviewed_at && (
                        <span className="text-zinc-500">
                          ({new Date(item.last_reviewed_at).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-zinc-500 group-hover:text-emerald-400 transition transform group-hover:translate-x-1">
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-500">
          <span>Don&apos;t see your exact pack?</span>
          <button
            onClick={onClose}
            className="text-emerald-400 hover:underline font-semibold"
          >
            Scan your physical label photo
          </button>
        </div>
      </div>
    </div>
  )
}
