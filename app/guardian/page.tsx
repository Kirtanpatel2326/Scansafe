'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import type { GuardianRequest } from '@/lib/guardian'
import {
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Search,
  CheckCircle,
  AlertTriangle,
  Camera,
  Upload,
  ShoppingBag,
  ExternalLink,
  X,
  RefreshCw
} from 'lucide-react'

type GuardianResult = {
  runId: string
  mode: string
  products: Array<{
    id: string
    name: string
    price: number | null
    evidenceSource: string
    status: string
    reasons: string[]
  }>
  shortlist: string[]
  steps: Array<{ tool: string; detail: string }>
  limitations: string[]
}

const blankProduct = () => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prod_${Math.random().toString(36).substring(7)}`,
  name: '',
  ingredients: '',
  allergenStatement: '',
  labelComplete: false,
  evidenceSource: '',
  price: undefined as number | undefined
})

const choices = ['peanut', 'tree_nut', 'milk', 'egg', 'soy', 'wheat', 'sesame'] as const

export default function GuardianPage() {
  const [goal, setGoal] = useState('Compare products for my dietary restrictions and budget.')
  const [constraints, setConstraints] = useState<string[]>(['peanut'])
  const [budget, setBudget] = useState('500')
  const [products, setProducts] = useState([blankProduct(), blankProduct()])
  const [result, setResult] = useState<GuardianResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Camera & Photo Evidence Extraction State
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

        const newProd = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `photo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: a.product_name || 'Scanned Food Product',
          ingredients: ingText || 'Extracted from packaging photo',
          allergenStatement: allergensText ? `Contains / May Contain: ${allergensText}` : 'No explicit allergens declared on visible label',
          labelComplete: Boolean(ingText && ingText.length > 5),
          evidenceSource: `Packaging Photo (${sourceName})`,
          price: undefined
        }

        setProducts(curr => {
          // Replace first blank product if present, otherwise append
          const firstBlankIdx = curr.findIndex(p => !p.name && !p.ingredients)
          if (firstBlankIdx >= 0) {
            const next = [...curr]
            next[firstBlankIdx] = newProd
            return next
          }
          return [...curr, newProd]
        })
        setOcrStatusText(`Extracted label: "${a.product_name || 'Product'}" successfully!`)
      } else if (res.status === 401) {
        setOcrStatusText('Note: OCR Vision requires sign-in, or use sample evidence.')
        alert('Please sign in to run live AI Vision OCR on photos, or test with sample products.')
      } else {
        setOcrStatusText(`Extraction notice: ${data.error || 'Could not parse text'}`)
      }
    } catch (e: any) {
      console.error('OCR Error:', e)
      setOcrStatusText('Network error during image recognition.')
    } finally {
      setTimeout(() => setIsOcrProcessing(false), 2000)
    }
  }

  const update = (id: string, patch: Partial<(typeof products)[number]>) =>
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))

  async function run() {
    setError('')
    setResult(null)
    setBusy(true)
    try {
      const payload: GuardianRequest = {
        goal,
        constraints: constraints as GuardianRequest['constraints'],
        currency: 'INR',
        ...(budget.trim() ? { budget: Number(budget) } : {}),
        products
      }
      const response = await fetch('/api/guardian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to evaluate products. Complete all required fields.')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 space-y-10">
        {/* HERO BANNER: AUTONOMOUS AGENT WORKSPACE */}
        <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-black p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Guardian AI Phase 2 Autonomous Agent</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white">
                Autonomous Food Safety Agent
              </h1>
              <p className="text-zinc-300 text-sm md:text-base mt-2 leading-relaxed">
                Looking for automated food research? The Guardian Agent searches verified catalogues, executes dynamic replanning, and deterministically cross-examines 15 allergen classes.
              </p>
            </div>
            <Link
              href="/guardian/agent"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-4 font-black text-base transition-transform hover:scale-105 shadow-xl shrink-0"
            >
              <span>Open Agent Workspace</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>

        {/* SECTION: MANUAL LABEL EVALUATOR */}
        <div>
          <h2 className="text-2xl font-black text-white">Custom Label Evaluation Sandbox</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Evaluate exact product label text that you provide directly. Deterministic rules verify every statement without guessing.
          </p>
        </div>

        <section className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-5">
          <h3 className="text-lg font-bold text-white">1. Set your shopping goal</h3>
          <label className="block text-sm text-zinc-300">
            What are you researching?
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              maxLength={500}
              rows={2}
              className="mt-2 w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-white text-sm focus:border-emerald-500 outline-none"
            />
          </label>
          <div>
            <p className="text-sm text-zinc-300 mb-3">Ingredients to avoid (select at least one):</p>
            <div className="flex gap-2 flex-wrap">
              {choices.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setConstraints(old => (old.includes(c) ? old.filter(v => v !== c) : [...old, c]))
                  }
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                    constraints.includes(c)
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {constraints.includes(c) ? `✓ ${c.replace('_', ' ')}` : `+ ${c.replace('_', ' ')}`}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm text-zinc-300">
            Maximum price per product (INR, optional):
            <input
              value={budget}
              onChange={e => setBudget(e.target.value)}
              type="number"
              min="0"
              className="mt-2 block w-full sm:w-64 rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-white text-sm focus:border-emerald-500 outline-none"
            />
          </label>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">2. Product Label Evidence</h3>
            <span className="text-xs text-zinc-400 font-mono">{products.length} Products Added</span>
          </div>
          <p className="text-xs text-amber-300/80">
            Copy the printed ingredient list and allergen statement accurately. A missing declaration must stay blank.
          </p>

          {/* CAMERA & PHOTO UPLOAD TOOLBAR */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Camera className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">Snap or Upload Packaging Photo</h4>
                <p className="text-xs text-zinc-400">
                  ScanSafe Vision OCR automatically extracts product name, ingredients & allergens.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={startCamera}
                disabled={isOcrProcessing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black px-4 py-2.5 text-xs font-bold transition shadow-md"
              >
                <Camera className="w-4 h-4 text-black" />
                Take Photo
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isOcrProcessing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-200 px-4 py-2.5 text-xs font-bold transition"
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
            <div className="rounded-xl border border-emerald-500/40 bg-zinc-900 p-3 flex items-center gap-2.5 text-xs text-emerald-300">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>{ocrStatusText || 'Extracting ingredients from packaging image via Vision OCR...'}</span>
            </div>
          )}
          {products.map((p, i) => (
            <div key={p.id} className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Product {i + 1}</span>
                <button
                  type="button"
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                  disabled={products.length === 1}
                  onClick={() => setProducts(old => old.filter(x => x.id !== p.id))}
                >
                  Remove Product
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  aria-label="Product name"
                  placeholder="Product name"
                  value={p.name}
                  onChange={e => update(p.id, { name: e.target.value })}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:border-emerald-500 outline-none"
                />
                <input
                  aria-label="Price in INR"
                  type="number"
                  min="0"
                  placeholder="Price in INR (optional)"
                  value={p.price ?? ''}
                  onChange={e => update(p.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:border-emerald-500 outline-none"
                />
              </div>
              <textarea
                aria-label="Exact ingredients"
                placeholder="Exact ingredients printed on package"
                rows={2}
                value={p.ingredients}
                onChange={e => update(p.id, { ingredients: e.target.value })}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:border-emerald-500 outline-none"
              />
              <textarea
                aria-label="Exact allergen statement"
                placeholder="Exact allergen or may-contain statement"
                rows={2}
                value={p.allergenStatement}
                onChange={e => update(p.id, { allergenStatement: e.target.value })}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:border-emerald-500 outline-none"
              />
              <input
                aria-label="Source reference"
                placeholder="Source: batch number, packaging photo reference, or URL"
                value={p.evidenceSource}
                onChange={e => update(p.id, { evidenceSource: e.target.value })}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:border-emerald-500 outline-none"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={p.labelComplete}
                  onChange={e => update(p.id, { labelComplete: e.target.checked })}
                  className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                />
                I have verified the complete legible ingredients and allergen statements
              </label>
            </div>
          ))}
          <button
            type="button"
            disabled={products.length >= 20}
            onClick={() => setProducts(p => [...p, blankProduct()])}
            className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded-xl text-xs font-bold text-zinc-300 transition"
          >
            + Add Another Product
          </button>
        </section>

        <button
          type="button"
          disabled={busy || constraints.length === 0}
          onClick={run}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black rounded-xl px-8 py-4 transition shadow-lg"
        >
          {busy ? 'Evaluating Evidence…' : 'Run Guardian Evaluation'}
        </button>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {result && (
          <section aria-live="polite" className="space-y-6 pt-4 border-t border-zinc-800">
            <div>
              <span className="text-xs font-mono text-emerald-400">Run ID: {result.runId}</span>
              <h3 className="text-xl font-black text-white mt-1">Guardian Findings</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {result.products.map(p => (
                <div key={p.id} className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-white text-base">{p.name || 'Untitled Product'}</h4>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        p.status === 'excluded'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : p.status === 'needs_review'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">Source: {p.evidenceSource || 'User input'}</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{p.reasons.join(' ')}</p>

                  {/* GO TO PRODUCT / BUY LINKS */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-zinc-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 mr-1">
                      <ShoppingBag className="w-3 h-3 text-emerald-400" /> Go to Product:
                    </span>
                    <a
                      href={`https://blinkit.com/s/?q=${encodeURIComponent(p.name || 'grocery')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 text-[10px] font-bold transition"
                    >
                      Blinkit <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={`https://www.zeptonow.com/search?q=${encodeURIComponent(p.name || 'grocery')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                    >
                      Zepto <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={`https://www.bigbasket.com/ps/?q=${encodeURIComponent(p.name || 'grocery')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                    >
                      BigBasket <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={`https://www.amazon.in/s?k=${encodeURIComponent(p.name || 'grocery')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                    >
                      Amazon <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-emerald-500/40 bg-emerald-950/20 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Candidate Shortlist (Evidence-Verified)</span>
              </h4>
              {result.shortlist.length ? (
                <div className="space-y-3">
                  {result.shortlist.map(id => {
                    const candidateProd = result.products.find(p => p.id === id)
                    const cName = candidateProd?.name || id
                    return (
                      <div key={id} className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {cName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <a
                            href={`https://blinkit.com/s/?q=${encodeURIComponent(cName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            Blinkit <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={`https://www.zeptonow.com/search?q=${encodeURIComponent(cName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            Zepto <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={`https://www.bigbasket.com/ps/?q=${encodeURIComponent(cName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            BigBasket <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href={`https://www.amazon.in/s?k=${encodeURIComponent(cName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold transition"
                          >
                            Amazon <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  No candidate has sufficient verified packaging evidence to qualify for the safe shortlist.
                </p>
              )}
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
