'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Database,
  Globe,
  History,
  Lock,
  RefreshCw,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  Camera,
  Upload,
  ShoppingBag,
  ExternalLink,
  X,
  Check
} from 'lucide-react'

const ALLERGEN_OPTIONS = [
  { id: 'peanut', label: 'Peanuts' },
  { id: 'tree_nut', label: 'Tree Nuts' },
  { id: 'milk', label: 'Milk / Dairy' },
  { id: 'egg', label: 'Eggs' },
  { id: 'soy', label: 'Soy' },
  { id: 'wheat', label: 'Wheat' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'sesame', label: 'Sesame' },
  { id: 'crustacean', label: 'Crustaceans' },
  { id: 'fish', label: 'Fish' },
  { id: 'mustard', label: 'Mustard' },
  { id: 'celery', label: 'Celery' },
  { id: 'lupin', label: 'Lupin' },
  { id: 'mollusc', label: 'Molluscs' },
  { id: 'sulphite', label: 'Sulphites' }
] as const

const GOAL_PRESETS = [
  'Find suitable peanut-free breakfast options under 250 INR',
  'Compare dairy-free protein bars with clean ingredient declarations',
  'Identify gluten-free snack options with zero cross-contact warnings',
  'Evaluate quick breakfast choices free from soy and tree nuts under 30 AED'
]

const blankProduct = () => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prod_${Math.random().toString(36).substring(7)}`,
  name: '',
  ingredients: '',
  allergenStatement: '',
  labelComplete: true,
  evidenceSource: 'User-provided package panel',
  price: undefined as number | undefined
})

type ManualProduct = ReturnType<typeof blankProduct>

interface StepLog {
  id: number
  tool: string
  status: 'completed' | 'failed' | 'skipped' | 'pending' | 'running'
  description: string
  at: string
  durationMs: number
}

interface EvaluatedProductItem {
  id: string
  name: string
  brand?: string
  price: number | null
  currency: 'INR' | 'AED' | 'USD'
  evidenceSource: string
  sourceType: string
  status: 'candidate' | 'excluded' | 'needs_review'
  reasons: string[]
  allergenHits?: string[]
  precautionaryNotice?: boolean
  conflictingClaims?: boolean
  uncertaintyScore?: number
  sourceUrl?: string
}

interface AgentResult {
  runId: string
  mode: string
  sourceMode: string
  plan: string[]
  products: EvaluatedProductItem[]
  shortlist: string[]
  steps: StepLog[]
  saved: boolean
  retrievalError: string | null
  retrievalErrors?: string[]
  uncertainties?: string[]
  safety: string
  limitations: string[]
}

interface HistoryTask {
  run_id: string
  goal: string
  shortlist: string[]
  created_at: string
}

export default function GuardianAgentPage() {
  const [goal, setGoal] = useState('Find suitable breakfast products for my dietary restrictions and budget.')
  const [constraints, setConstraints] = useState<string[]>(['peanut'])
  const [budget, setBudget] = useState('500')
  const [currency, setCurrency] = useState<'INR' | 'AED' | 'USD'>('INR')
  
  // Research Tools Configuration
  const [allowInternalCatalog, setAllowInternalCatalog] = useState(true)
  const [allowPublicOffCatalog, setAllowPublicOffCatalog] = useState(false)
  const [allowPartnerCatalog, setAllowPartnerCatalog] = useState(false)

  // Affirmative Consent Gate
  const [approveSave, setApproveSave] = useState(false)

  // Evidence Inputs
  const [showManualEvidence, setShowManualEvidence] = useState(false)
  const [products, setProducts] = useState<ManualProduct[]>([blankProduct()])

  // State
  const [result, setResult] = useState<AgentResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  // Camera & Photo Extraction State
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrStatusText, setOcrStatusText] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    setCameraError(null)
    setIsCameraOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(e => console.error('Video play error:', e))
        }
      }, 100)
    } catch (err: any) {
      console.error('Camera access error:', err)
      setCameraError('Unable to access device camera. Please allow camera permissions or upload an image.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()
    processImageEvidence(base64, 'Live Camera Snapshot')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      processImageEvidence(base64, file.name)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const processImageEvidence = async (base64Image: string, sourceName: string) => {
    setIsOcrProcessing(true)
    setOcrStatusText('Reading packaging label via Vision OCR...')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          filename: sourceName,
          isSample: false
        })
      })
      const data = await res.json()
      if (res.ok && data.success && data.analysis) {
        const a = data.analysis
        const ingText = Array.isArray(a.ingredients)
          ? a.ingredients.map((i: any) => typeof i === 'string' ? i : i.name).join(', ')
          : (a.ingredients || '')
        const allergensText = Array.isArray(a.allergens_declared) && a.allergens_declared.length > 0
          ? a.allergens_declared.join(', ')
          : (Array.isArray(a.allergens) ? a.allergens.join(', ') : '')

        const newProd: ManualProduct = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: a.product_name || 'Scanned Food Product',
          ingredients: ingText || 'Extracted from packaging photo',
          allergenStatement: allergensText ? `Contains / May Contain: ${allergensText}` : 'No explicit allergens declared on visible label',
          labelComplete: Boolean(ingText && ingText.length > 5),
          evidenceSource: `Packaging Photo (${sourceName})`,
          price: undefined
        }

        setProducts(curr => {
          const hasOnlyBlank = curr.length === 1 && !curr[0].name && !curr[0].ingredients
          if (hasOnlyBlank) return [newProd]
          return [...curr, newProd]
        })
        setShowManualEvidence(true)
      } else {
        const fallbackProd: ManualProduct = {
          id: `photo_${Date.now()}`,
          name: 'Package Photo Evidence',
          ingredients: '',
          allergenStatement: '',
          labelComplete: false,
          evidenceSource: `Uploaded Photo (${sourceName})`,
          price: undefined
        }
        setProducts(curr => [...curr, fallbackProd])
        setShowManualEvidence(true)
      }
    } catch (err) {
      console.warn('Vision OCR failed:', err)
      const fallbackProd: ManualProduct = {
        id: `photo_${Date.now()}`,
        name: 'Captured Packaging Photo',
        ingredients: '',
        allergenStatement: '',
        labelComplete: false,
        evidenceSource: `Photo (${sourceName})`,
        price: undefined
      }
      setProducts(curr => [...curr, fallbackProd])
      setShowManualEvidence(true)
    } finally {
      setIsOcrProcessing(false)
      setOcrStatusText('')
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/guardian/history')
      if (res.ok) {
        const data = await res.json()
        if (data.tasks) setHistoryTasks(data.tasks)
      }
    } catch {
      // Ignored if offline or not logged in
    } finally {
      setHistoryLoading(false)
    }
  }

  const updateProduct = (id: string, patch: Partial<ManualProduct>) => {
    setProducts(current => current.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  const toggleConstraint = (id: string) => {
    setConstraints(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  async function handleRunAgent() {
    setError('')
    setResult(null)
    setBusy(true)

    try {
      let manualPayload: ManualProduct[] | undefined = undefined
      if (showManualEvidence) {
        const validProducts = products.filter(
          p => p.name.trim() || p.ingredients.trim() || p.allergenStatement.trim()
        )
        if (validProducts.length > 0) {
          if (validProducts.some(p => !p.name.trim() || !p.evidenceSource.trim())) {
            throw new Error('Each entered product needs a valid name and evidence reference source.')
          }
          manualPayload = validProducts
        }
      }

      const response = await fetch('/api/guardian/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          goal,
          constraints,
          budget: budget ? Number(budget) : undefined,
          currency,
          allowCatalogSearch: allowPartnerCatalog,
          allowInternalCatalog,
          allowPublicOffCatalog,
          allowPartnerCatalog,
          products: manualPayload,
          maxResults: 5,
          approvedActions: approveSave ? ['save_shortlist'] : []
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Guardian autonomous execution failed.')
      }
      setResult(data)
      if (approveSave && data.saved) {
        fetchHistory()
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Unable to complete agent execution.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
      <Header />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        
        {/* Navigation & Header */}
        <div className="border-b border-zinc-800 pb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <a
              href="/guardian"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              ← Back to Guardian Evidence Auditor
            </a>
            <button
              onClick={() => {
                setShowHistory(!showHistory)
                if (!showHistory) fetchHistory()
              }}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg px-3 py-1.5 transition"
            >
              <History className="w-3.5 h-3.5" />
              {showHistory ? 'Hide History' : `Task History (${historyTasks.length})`}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              ScanSafe Guardian AI • Phase 2
            </span>
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-mono">
              Deterministic State Machine
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2">
            Autonomous Food Research & Safety Agent
          </h1>
          <p className="text-zinc-400 text-sm max-w-3xl mt-2 leading-relaxed">
            Performs goal-driven multi-source catalog research, cross-references ingredients against 15 strict dietary constraints, enforces affirmative user persistence controls, and guarantees zero fabricated products.
          </p>
        </div>

        {/* Task History Drawer (If toggled) */}
        {showHistory && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Persistent Agent Vault (Supabase RLS)
              </h2>
              {historyLoading && <span className="text-xs text-zinc-500">Loading...</span>}
            </div>
            {historyTasks.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No saved agent runs found. Sign in and check &quot;I approve saving this shortlist&quot; to persist tasks securely.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800 max-h-60 overflow-y-auto">
                {historyTasks.map(t => (
                  <div key={t.run_id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-zinc-300">{t.goal}</p>
                      <p className="text-zinc-500 text-[11px] font-mono mt-0.5">
                        {new Date(t.created_at).toLocaleString()} • {t.shortlist?.length || 0} candidate(s)
                      </p>
                    </div>
                    <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/40">
                      ID: {t.run_id.slice(0, 8)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Step 1: Goal & Objectives */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              1
            </span>
            <h2 className="text-lg font-bold text-white">Define Research Objective</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              Natural Language Goal
            </label>
            <textarea
              aria-label="Natural Language Goal"
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. Find peanut-free oat breakfast options under 300 INR"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] text-zinc-500 self-center">Presets:</span>
              {GOAL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setGoal(preset)}
                  className="rounded-md bg-zinc-800/60 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                >
                  {preset.slice(0, 36)}...
                </button>
              ))}
            </div>
          </div>

          {/* Constraints Selector */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
              Active Restricted Dietary Criteria ({constraints.length} Selected)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALLERGEN_OPTIONS.map(c => {
                const active = constraints.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleConstraint(c.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition border ${
                      active
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {active && '✓ '}
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Budget & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Budget Ceiling (Per Item)
              </label>
              <input
                type="number"
                min="1"
                aria-label="Budget Ceiling"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                value={budget}
                onChange={e => setBudget(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Currency
              </label>
              <select
                aria-label="Currency"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                value={currency}
                onChange={e => setCurrency(e.target.value as typeof currency)}
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="AED">AED (د.إ - UAE Dirham)</option>
                <option value="USD">USD ($ - US Dollar)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Step 2: Research Tools & Authorized Catalogs */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              2
            </span>
            <h2 className="text-lg font-bold text-white">Authorized Research Sources</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Select permitted information sources. If no verified evidence is returned by a tool, the agent reports that fact rather than hallucinating products.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Tool 1 */}
            <label className={`cursor-pointer rounded-xl border p-4 transition flex flex-col justify-between ${
              allowInternalCatalog ? 'border-emerald-600/70 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/60'
            }`}>
              <div className="flex items-start justify-between">
                <Database className={`w-5 h-5 ${allowInternalCatalog ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <input
                  type="checkbox"
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                  checked={allowInternalCatalog}
                  onChange={e => setAllowInternalCatalog(e.target.checked)}
                />
              </div>
              <div className="mt-3">
                <h3 className="text-xs font-bold text-zinc-200">ScanSafe Reviewed Catalog</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Curated internal database with verified package panels.</p>
              </div>
            </label>

            {/* Tool 2 */}
            <label className={`cursor-pointer rounded-xl border p-4 transition flex flex-col justify-between ${
              allowPublicOffCatalog ? 'border-emerald-600/70 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/60'
            }`}>
              <div className="flex items-start justify-between">
                <Globe className={`w-5 h-5 ${allowPublicOffCatalog ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <input
                  type="checkbox"
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                  checked={allowPublicOffCatalog}
                  onChange={e => setAllowPublicOffCatalog(e.target.checked)}
                />
              </div>
              <div className="mt-3">
                <h3 className="text-xs font-bold text-zinc-200">Open Food Facts API</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Crowdsourced public food knowledgebase (read-only).</p>
              </div>
            </label>

            {/* Tool 3 */}
            <label className={`cursor-pointer rounded-xl border p-4 transition flex flex-col justify-between ${
              allowPartnerCatalog ? 'border-emerald-600/70 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-950/60'
            }`}>
              <div className="flex items-start justify-between">
                <Lock className={`w-5 h-5 ${allowPartnerCatalog ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <input
                  type="checkbox"
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                  checked={allowPartnerCatalog}
                  onChange={e => setAllowPartnerCatalog(e.target.checked)}
                />
              </div>
              <div className="mt-3">
                <h3 className="text-xs font-bold text-zinc-200">Partner Manufacturer Feed</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Signed partner integration via HTTPS connector.</p>
              </div>
            </label>
          </div>

          {/* User Provided Evidence Accordion */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowManualEvidence(!showManualEvidence)}
              className="flex items-center justify-between w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Provide Specific Physical Package Evidence ({products.length} Item{products.length > 1 ? 's' : ''})
              </span>
              {showManualEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showManualEvidence && (
              <div className="mt-3 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                <p className="text-xs text-amber-300/90 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  Supply both the ingredient panel and allergen declaration verbatim, or snap a photo of the package to auto-extract with Vision OCR.
                </p>

                {/* CAMERA & PHOTO UPLOAD TOOLBAR */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <Camera className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Take Photo or Upload Packaging Image</h4>
                      <p className="text-[11px] text-zinc-400">
                        ScanSafe Vision OCR reads the label and auto-populates product name, ingredients, and allergens.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isOcrProcessing}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-3.5 py-2 text-xs font-bold transition shadow-sm"
                    >
                      <Camera className="w-4 h-4 text-black" />
                      Take Photo
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isOcrProcessing}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-200 px-3.5 py-2 text-xs font-bold transition"
                    >
                      <Upload className="w-4 h-4 text-zinc-400" />
                      Upload Image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                {isOcrProcessing && (
                  <div className="rounded-lg border border-emerald-500/40 bg-zinc-900 p-3 flex items-center gap-2.5 text-xs text-emerald-300">
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>{ocrStatusText || 'Extracting ingredients from packaging image via Vision OCR...'}</span>
                  </div>
                )}

                {products.map((p, idx) => (
                  <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">Item #{idx + 1}</span>
                      {products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setProducts(curr => curr.filter(x => x.id !== p.id))}
                          className="text-[11px] text-rose-400 hover:text-rose-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        placeholder="Product Name"
                        className="rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100"
                        value={p.name}
                        onChange={e => updateProduct(p.id, { name: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        className="rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100"
                        value={p.price ?? ''}
                        onChange={e => updateProduct(p.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Ingredients verbatim as printed on package"
                      className="w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100"
                      value={p.ingredients}
                      onChange={e => updateProduct(p.id, { ingredients: e.target.value })}
                    />

                    <textarea
                      rows={1}
                      placeholder="Allergen statement or precautionary warning (e.g. Contains: milk; May contain peanuts)"
                      className="w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-100"
                      value={p.allergenStatement}
                      onChange={e => updateProduct(p.id, { allergenStatement: e.target.value })}
                    />

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px]">
                      <input
                        placeholder="Evidence reference (e.g. Photo ID, Manufacturer URL)"
                        className="rounded border border-zinc-800 bg-zinc-950 p-1.5 text-xs text-zinc-100 flex-1 min-w-[200px]"
                        value={p.evidenceSource}
                        onChange={e => updateProduct(p.id, { evidenceSource: e.target.value })}
                      />
                      <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.labelComplete}
                          onChange={e => updateProduct(p.id, { labelComplete: e.target.checked })}
                          className="rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                        />
                        Label is complete and readable
                      </label>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setProducts(curr => [...curr, blankProduct()])}
                  className="rounded border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  + Add Another Evidence Record
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Step 3: Affirmative Consent & Execution Control */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
              3
            </span>
            <h2 className="text-lg font-bold text-white">Execution Authorization & Persistence Gate</h2>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={approveSave}
                onChange={e => setApproveSave(e.target.checked)}
                className="mt-1 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
              />
              <div className="text-xs">
                <span className="font-semibold text-zinc-200 block">
                  Affirmative Consent: Authorize persisting shortlisted tasks to account vault
                </span>
                <span className="text-zinc-400 block mt-0.5">
                  Guardian will only record execution tasks in Supabase when this box is affirmatively checked. Unauthenticated runs never write to the database.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-4">
            <button
              type="button"
              onClick={handleRunAgent}
              disabled={busy || !constraints.length}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-7 py-3 text-sm transition shadow-lg shadow-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {busy ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Executing Autonomous Tools...
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4" />
                  Run Autonomous Guardian Agent
                </>
              )}
            </button>

            <span className="text-xs text-zinc-500 font-mono">
              Deterministic Rules Engine • Fail-Closed
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* Step 4: Results & Trace Output */}
        {result && (
          <section aria-live="polite" className="space-y-6 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
                  Autonomous Plan Completed
                </span>
                <h2 className="text-2xl font-extrabold text-white">Agent Audit Report</h2>
              </div>
              <div className="text-right text-xs font-mono text-zinc-500">
                <p>Run: {result.runId.slice(0, 8)}</p>
                <p>Source Mode: {result.sourceMode}</p>
              </div>
            </div>

            {/* Structured Execution Plan Stages */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Autonomous State Machine Plan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {result.plan.map((stepDesc, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2 text-zinc-400 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{stepDesc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Retrieval Error Warning if any */}
            {result.retrievalError && (
              <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-3.5 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong>Source Retrieval Advisory:</strong> {result.retrievalError}
                  <p className="text-[11px] text-amber-300/80 mt-1">
                    Zero fake candidate records were synthesized. Safety guarantees preserved.
                  </p>
                </div>
              </div>
            )}

            {/* Shortlist Card */}
            <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Verified Candidate Shortlist ({result.shortlist.length})
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  Saved to vault: {result.saved ? '✓ YES' : 'NO (Unapproved or Unauthenticated)'}
                </span>
              </div>

              {result.shortlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {result.shortlist.map(id => {
                    const matched = result.products.find(p => p.id === id)
                    const prodName = matched?.name || id
                    return (
                      <div key={id} className="rounded-xl bg-zinc-900/90 border border-emerald-500/40 p-4 space-y-2.5 text-xs shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="text-zinc-100 font-bold text-sm block">{prodName}</strong>
                            {matched?.price !== null && matched?.price !== undefined && (
                              <p className="text-emerald-400 text-xs font-mono font-bold mt-0.5">
                                {matched.price} {matched.currency}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                            Verified Candidate
                          </span>
                        </div>

                        {/* GO TO PRODUCT / BUY LINKS */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-800">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 mr-1">
                            <ShoppingBag className="w-3 h-3 text-emerald-400" /> Go to Product:
                          </span>
                          <a
                            href={`https://blinkit.com/s/?q=${encodeURIComponent(prodName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            Blinkit <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={`https://www.zeptonow.com/search?q=${encodeURIComponent(prodName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            Zepto <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={`https://www.bigbasket.com/ps/?q=${encodeURIComponent(prodName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            BigBasket <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={`https://www.amazon.in/s?k=${encodeURIComponent(prodName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            Amazon <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          {matched?.sourceUrl && (
                            <a
                              href={matched.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                            >
                              Source Data <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  No products satisfied all deterministic safety and budget criteria.
                </p>
              )}
            </div>

            {/* All Evaluated Products Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-200">
                Evidence Evaluation Breakdown ({result.products.length} Products Screened)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {result.products.map(p => {
                  const isCandidate = p.status === 'candidate'
                  const isExcluded = p.status === 'excluded'

                  return (
                    <article
                      key={p.id}
                      className={`rounded-xl border p-4 space-y-2.5 transition ${
                        isCandidate
                          ? 'border-emerald-800/60 bg-zinc-900/60'
                          : isExcluded
                          ? 'border-rose-900/40 bg-zinc-900/40'
                          : 'border-amber-800/50 bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="font-bold text-zinc-100 text-sm flex items-center gap-2">
                            {p.name}
                            {p.price !== null && (
                              <span className="text-xs font-mono font-normal text-zinc-400">
                                ({p.price} {p.currency})
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                            Source: {p.sourceType} • {p.evidenceSource}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {p.uncertaintyScore !== undefined && (
                            <span className="text-[11px] font-mono text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded">
                              Uncertainty: {Math.round(p.uncertaintyScore * 100)}%
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isCandidate
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : isExcluded
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {p.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/50">
                        {p.reasons.map((r, rIdx) => (
                          <p key={rIdx} className="flex items-start gap-1.5">
                            <span className="text-zinc-500">•</span>
                            <span>{r}</span>
                          </p>
                        ))}
                      </div>

                      {/* GO TO PRODUCT / BUY LINKS */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-800/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 mr-1">
                          <ShoppingBag className="w-3 h-3 text-emerald-400" /> Go to Product:
                        </span>
                        <a
                          href={`https://blinkit.com/s/?q=${encodeURIComponent(p.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 text-[10px] font-bold transition"
                        >
                          Blinkit <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a
                          href={`https://www.zeptonow.com/search?q=${encodeURIComponent(p.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                        >
                          Zepto <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a
                          href={`https://www.bigbasket.com/ps/?q=${encodeURIComponent(p.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                        >
                          BigBasket <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        <a
                          href={`https://www.amazon.in/s?k=${encodeURIComponent(p.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                        >
                          Amazon <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        {p.sourceUrl && (
                          <a
                            href={p.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            Source Data <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            {/* Trace Steps Log */}
            <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <summary className="cursor-pointer text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>Execution Trace & Tool Logs ({result.steps.length} Actions)</span>
                <span className="text-zinc-500 font-normal">Click to toggle audit trail</span>
              </summary>
              <ol className="mt-3 space-y-2 text-xs font-mono">
                {result.steps.map(s => (
                  <li key={s.id} className="p-2 rounded bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-3">
                    <div>
                      <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded mr-2 ${
                        s.status === 'completed'
                          ? 'bg-emerald-950 text-emerald-300'
                          : s.status === 'failed'
                          ? 'bg-rose-950 text-rose-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {s.tool}
                      </span>
                      <span className="text-zinc-300">{s.description}</span>
                    </div>
                    <span className="text-zinc-500 text-[11px] flex-shrink-0">
                      {s.durationMs}ms
                    </span>
                  </li>
                ))}
              </ol>
            </details>

            {/* Medical & Toxicological Safety Disclaimer */}
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 space-y-2 text-xs text-amber-200">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Deterministic Verification Notice
              </div>
              <p>{result.safety}</p>
              <div className="space-y-1 text-zinc-400 text-[11px] pt-1">
                {result.limitations.map((lim, limIdx) => (
                  <p key={limIdx}>• {lim}</p>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* LIVE CAMERA VIEWFINDER MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Capture Food Package Label</h3>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-3">
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-800 bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="h-full w-full object-cover"
                  />
                  {/* Framing Crosshair Overlay */}
                  <div className="absolute inset-6 border-2 border-dashed border-emerald-400/60 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded self-start">
                      Align Ingredients & Allergen Box
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-black/60 px-1.5 py-0.5 rounded self-end">
                      ScanSafe High-Res Capture
                    </span>
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                  >
                    <Camera className="w-4 h-4 text-black" />
                    Snap Photo & Extract Evidence
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
