'use client'

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Bookmark, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  Camera, 
  RefreshCw, 
  SlidersHorizontal,
  CheckCircle2,
  Scale
} from "lucide-react"

interface SavedItem {
  id: string
  product_name: string
  brand?: string
  pack_size?: string
  barcode?: string
  result_json: any
  created_at: string
}

export default function SavedProductsPage() {
  const router = useRouter()
  const [items, setItems] = useState<SavedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterSafety, setFilterSafety] = useState<string>("all")

  const fetchSaved = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/saved")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login?redirect=/saved")
          return
        }
        throw new Error("Failed to load saved shopping list")
      }
      const data = await res.json()
      setItems(data.items || [])
    } catch (e: any) {
      setError(e.message || "Failed to load saved products")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSaved()
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/saved?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id))
        setSelectedIds(prev => prev.filter(selId => selId !== id))
      }
    } catch (e) {
      console.error("Delete failed:", e)
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(selId => selId !== id))
    } else {
      if (selectedIds.length >= 2) {
        // Keep max 2 selected for comparison
        setSelectedIds([selectedIds[1], id])
      } else {
        setSelectedIds(prev => [...prev, id])
      }
    }
  }

  const handleCompareSelected = () => {
    if (selectedIds.length !== 2) return
    const itemA = items.find(i => i.id === selectedIds[0])
    const itemB = items.find(i => i.id === selectedIds[1])
    if (!itemA || !itemB) return

    // Store comparison products in sessionStorage and route to /compare
    try {
      sessionStorage.setItem("scansafe_compare_saved_A", JSON.stringify(itemA.result_json))
      sessionStorage.setItem("scansafe_compare_saved_B", JSON.stringify(itemB.result_json))
      router.push("/compare?mode=saved")
    } catch (e) {
      console.error("Session storage error:", e)
    }
  }

  const filteredItems = items.filter(item => {
    if (filterSafety === "all") return true
    const safety = item.result_json?.safety_level
    return safety === filterSafety
  })

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Shopping Assistant
            </span>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono">
              0 Credits Used
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Saved Shopping List
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Curate clean groceries, track verified label formulations, and run instant head-to-head comparisons.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {selectedIds.length === 2 && (
            <button
              onClick={handleCompareSelected}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 animate-pulse"
            >
              <Scale className="w-4 h-4" /> Compare 2 Selected
            </button>
          )}

          <Link
            href="/scan"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700 transition"
          >
            <Camera className="w-4 h-4 text-emerald-400" /> Scan More Foods
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-zinc-500 font-semibold flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setFilterSafety("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterSafety === "all"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilterSafety("safe")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterSafety === "safe"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-zinc-400 hover:text-emerald-400"
            }`}
          >
            Nutritionally Favorable
          </button>
          <button
            onClick={() => setFilterSafety("moderate")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterSafety === "moderate"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-zinc-400 hover:text-amber-400"
            }`}
          >
            Moderate
          </button>
          <button
            onClick={() => setFilterSafety("danger")}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterSafety === "danger"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-zinc-400 hover:text-rose-400"
            }`}
          >
            High Concern
          </button>
        </div>

        {selectedIds.length > 0 && (
          <span className="text-xs text-emerald-400 font-semibold shrink-0">
            {selectedIds.length}/2 selected for comparison
          </span>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs text-zinc-400">Loading saved products...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
          <p className="text-rose-400 text-sm font-semibold">{error}</p>
          <button
            onClick={fetchSaved}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-850 bg-zinc-950/40 p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <Bookmark className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Your Shopping List is Empty</h3>
            <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed">
              Whenever you scan or search a food product, tap &ldquo;Save to Shopping List&rdquo; to build your personal pantry catalog and run head-to-head comparisons.
            </p>
          </div>
          <Link
            href="/scan"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/10 transition mt-2"
          >
            <Camera className="w-4 h-4" /> Start Your First Scan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const res = item.result_json || {}
            const isSelected = selectedIds.includes(item.id)
            const score = res.health_score
            const safety = res.safety_level || "moderate"
            const imgUrl = res.image_url || res.image || (res.evidence_images && res.evidence_images[0])

            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`relative rounded-2xl border p-5 transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10"
                    : "border-zinc-850 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/60"
                }`}
              >
                {/* Selection Checkmark */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button
                    onClick={e => handleDelete(item.id, e)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition"
                    title="Remove from saved list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-400 text-black font-bold"
                        : "border-zinc-700 bg-zinc-900/80 text-transparent"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 fill-current" />
                  </div>
                </div>

                <div>
                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-3.5 pr-14">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={item.product_name}
                        className="w-14 h-14 rounded-xl object-cover border border-zinc-800 shrink-0 bg-zinc-900"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-500 shrink-0">
                        <Bookmark className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        {item.brand || res.brand || "Unbranded"}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate mt-0.5" title={item.product_name}>
                        {item.product_name}
                      </h4>
                      {item.pack_size && (
                        <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                          Pack: {item.pack_size}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Badges */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {score !== null && score !== undefined && (
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${
                        score >= 70 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        score >= 40 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}>
                        Score {score}
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {safety}
                    </span>
                    {res.nutrition_basis && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        {res.nutrition_basis}
                      </span>
                    )}
                  </div>

                  {/* Key Nutrition Highlights */}
                  {res.nutrition_facts && (
                    <div className="grid grid-cols-3 gap-2 text-[10px] mt-3 pt-3 border-t border-zinc-850/60 text-zinc-400">
                      <div>
                        <span className="text-zinc-500 block">Sugar:</span>
                        <span className="text-white font-bold">{res.nutrition_facts.sugar_100g || res.nutrition_facts.sugar || "—"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Sodium:</span>
                        <span className="text-white font-bold">{res.nutrition_facts.sodium_100g || res.nutrition_facts.sodium || "—"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Protein:</span>
                        <span className="text-white font-bold">{res.nutrition_facts.protein_100g || res.nutrition_facts.protein || "—"}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-850/40 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Saved {new Date(item.created_at).toLocaleDateString()}</span>
                  <span className="text-emerald-400 font-bold group-hover:underline">
                    {isSelected ? "Selected" : "Select to compare"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
