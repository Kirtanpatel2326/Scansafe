'use client'

import React, { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ShieldAlert, 
  ShieldCheck, 
  Check, 
  X, 
  RotateCcw, 
  AlertTriangle, 
  RefreshCw, 
  Camera, 
  FileText,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react'

interface PendingCorrection {
  id: string
  product_id: string
  product_name: string
  user_id: string
  field_name: string
  original_value: any
  corrected_value: any
  notes?: string
  status: string
  created_at: string
  product_evidence?: string[]
}

export default function ReviewerPortalPage() {
  const router = useRouter()
  const [corrections, setCorrections] = useState<PendingCorrection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({})
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchCorrections = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/reviews')
      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg('Access Denied: You do not have reviewer or admin credentials.')
          setIsLoading(false)
          return
        }
        if (res.status === 401) {
          router.push('/auth?redirect=/admin/reviews')
          return
        }
        throw new Error('Failed to load review queue')
      }
      const data = await res.json()
      setCorrections(data.corrections || [])
    } catch (e: any) {
      setErrorMsg(e.message || 'Error fetching review queue')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCorrections()
  }, [])

  const handleAction = async (correctionId: string, action: 'approve' | 'reject') => {
    setActiveActionId(correctionId)
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          correction_id: correctionId,
          notes: reviewerNotes[correctionId] || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} correction`)
      }

      setActionSuccess(`Correction successfully ${action}d!`)
      setCorrections(prev => prev.filter(c => c.id !== correctionId))
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (e: any) {
      alert(e.message || 'Action failed')
    } finally {
      setActiveActionId(null)
    }
  }

  const handleRollback = async (barcode: string, targetVersion: number) => {
    if (!confirm(`Are you sure you want to rollback ${barcode} to version ${targetVersion}?`)) return
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rollback',
          barcode,
          target_version: targetVersion
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Rollback failed')
      }
      alert('Product formulation successfully rolled back to target version.')
      fetchCorrections()
    } catch (e: any) {
      alert(e.message || 'Rollback error')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Authorized Governance
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                Reviewer Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-emerald-400" /> Label Correction Queue
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Verify community corrections against physical packaging photos. All approvals create immutable version snapshots for instant rollback.
            </p>
          </div>

          <button
            onClick={fetchCorrections}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700 transition cursor-pointer self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
          </button>
        </div>

        {actionSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-300 font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-zinc-400">Loading reviewer queue...</p>
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center max-w-lg mx-auto">
            <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Access Restricted</h3>
            <p className="text-xs text-rose-300/90 leading-relaxed mb-6">{errorMsg}</p>
            <Link
              href="/scan"
              className="inline-flex px-5 py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-white text-xs font-bold border border-zinc-700 transition"
            >
              Return to Scanner
            </Link>
          </div>
        ) : corrections.length === 0 ? (
          <div className="rounded-2xl border border-zinc-850 bg-zinc-950/40 p-12 text-center flex flex-col items-center justify-center gap-3">
            <ShieldCheck className="w-14 h-14 text-emerald-400/80 mb-2" />
            <h3 className="text-lg font-bold text-white">Review Queue is Clear!</h3>
            <p className="text-xs text-zinc-400 max-w-md">
              There are no pending user corrections awaiting human verification. All current catalog formulations are up-to-date with original evidence.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {corrections.map((corr) => {
              const isProcessing = activeActionId === corr.id

              return (
                <div
                  key={corr.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 flex flex-col gap-6 shadow-xl"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-zinc-500">
                          Product ID / Barcode: {corr.product_id}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded font-mono font-bold">
                          Pending Review
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        {corr.product_name}
                      </h3>
                      <span className="text-xs text-zinc-400">
                        Target Field: <strong className="text-emerald-400 capitalize">{corr.field_name.replace('_', ' ')}</strong>
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Submitted {new Date(corr.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Evidence & Diff Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Value */}
                    <div className="rounded-xl border border-zinc-850 bg-zinc-900/40 p-4">
                      <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider block mb-2">
                        Original Extracted Value
                      </span>
                      <pre className="text-xs font-mono text-zinc-400 bg-black/60 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-56">
                        {JSON.stringify(corr.original_value, null, 2)}
                      </pre>
                    </div>

                    {/* Corrected Value */}
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4">
                      <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider block mb-2">
                        Proposed Correction (User Provenance)
                      </span>
                      <pre className="text-xs font-mono text-emerald-200 bg-black/60 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-56">
                        {JSON.stringify(corr.corrected_value, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* User Notes */}
                  {corr.notes && (
                    <div className="bg-zinc-900/40 rounded-xl p-3 border border-zinc-850 text-xs">
                      <strong className="text-zinc-300">Submitter Notes: </strong>
                      <span className="text-zinc-400">{corr.notes}</span>
                    </div>
                  )}

                  {/* Reviewer Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-850 pt-4">
                    <input
                      type="text"
                      placeholder="Optional notes or audit rationale..."
                      value={reviewerNotes[corr.id] || ''}
                      onChange={(e) => setReviewerNotes({ ...reviewerNotes, [corr.id]: e.target.value })}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(corr.id, 'reject')}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-zinc-850 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/40 border border-zinc-750 text-xs font-bold text-zinc-300 transition cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5 inline mr-1" /> Reject
                      </button>
                      <button
                        onClick={() => handleAction(corr.id, 'approve')}
                        disabled={isProcessing}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" /> Approve & Bump Version
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
