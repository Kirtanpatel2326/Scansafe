'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Upload, 
  Camera, 
  Check, 
  X, 
  ShieldAlert, 
  Sparkles, 
  Barcode, 
  Mic, 
  MicOff, 
  ListOrdered,
  FileText,
  Search
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ScanUploadProps {
  onScanStart: () => void
  onScanSuccess: (result: any, scanId?: string, imageUrl?: string) => void
  onScanError: (error: string) => void
}

const DIETARY_PREFERENCES = [
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'nut-free', label: 'Nut-Free' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'jain', label: 'Jain Diet' },
  { id: 'diabetic', label: 'Diabetes' },
  { id: 'hypertension', label: 'Hypertension' },
  { id: 'pregnancy', label: 'Pregnancy-Safe' },
  { id: 'cardiovascular', label: 'Heart-Conscious' }
]

const MOCK_PRESETS = [
  { id: 'lotte-choco-pie', name: 'Lotte Choco Pie', brand: 'Lotte', emoji: '🍩', barcode: '8901058860269' },
  { id: 'oreo', name: 'Oreo Cookies', brand: 'Nabisco', emoji: '🍪', barcode: '7622300744115' },
  { id: 'coca-cola', name: 'Coca-Cola', brand: 'The Coca-Cola Company', emoji: '🥤', barcode: '5449000000996' },
  { id: 'lays', name: 'Lay\'s Chips', brand: 'Frito-Lay', emoji: '🥔', barcode: '028400070566' },
  { id: 'heinz', name: 'Heinz Ketchup', brand: 'Kraft Heinz', emoji: '🍅', barcode: '013000006038' },
  { id: 'quaker-oats', name: 'Quaker Oats', brand: 'Quaker Oats', emoji: '🌾', barcode: '030000010204' },
  { id: 'chobani-yogurt', name: 'Chobani Yogurt', brand: 'Chobani', emoji: '🥛', barcode: '894700010074' }
]

function generateClientOpKey(prefix = 'scan'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function ScanUpload({ onScanStart, onScanSuccess, onScanError }: ScanUploadProps) {
  const [activeSubTab, setActiveSubTab] = useState<'vision' | 'barcode' | 'batch'>('vision')
  const [dragActive, setDragActive] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([])
  const [productNameInput, setProductNameInput] = useState('')
  const [fileName, setFileName] = useState('')
  const [selectionRequired, setSelectionRequired] = useState(false)
  const [activeOpKey, setActiveOpKey] = useState<string>(() => generateClientOpKey('scan'))
  
  // Barcode search input
  const [barcodeInput, setBarcodeInput] = useState('')

  // Batch queue
  const [batchQueue, setBatchQueue] = useState<Array<{ file: File, preview: string, status: 'pending' | 'scanning' | 'success' | 'failed', result?: any, idempotencyKey?: string }>>([])
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  // Voice Recognition
  const [isListening, setIsListening] = useState(false)
  const [speechTranscript, setSpeechTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const loadingSteps = [
    'Preparing packaging label image...',
    'Extracting ingredients & nutritional panel via Vision OCR...',
    'Analyzing food additive safety & NOVA processing levels...',
    'Computing evidence-based health score...',
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loading) {
      setLoadingStep(0)
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev))
      }, 750)
    }
    return () => clearInterval(interval)
  }, [loading])

  useEffect(() => {
    // Check speech recognition support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = false
        rec.interimResults = false
        rec.lang = 'en-US'
        
        rec.onstart = () => setIsListening(true)
        rec.onend = () => setIsListening(false)
        rec.onresult = (event: any) => {
          const text = event.results[0][0].transcript.toLowerCase()
          setSpeechTranscript(text)
          processVoiceCommand(text)
        }
        recognitionRef.current = rec
      }
    }
    return () => {
      stopCamera()
    }
  }, [])

  const processVoiceCommand = (command: string) => {
    console.log('Voice Command Received:', command)
    if (command.includes('cereal') || command.includes('demo') || command.includes('sample')) {
      handleScanSubmit(undefined, true)
    } else if (command.includes('reset') || command.includes('clear') || command.includes('back')) {
      clearSelection()
    } else if (command.includes('scan') || command.includes('submit') || command.includes('analyze')) {
      if (imagePreview) handleScanSubmit()
    } else if (command.includes('barcode')) {
      const numbers = command.replace(/[^0-9]/g, '')
      if (numbers) {
        setBarcodeInput(numbers)
        handleScanSubmit(undefined, false, undefined, undefined, numbers)
      }
    }
  }

  const toggleVoiceListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      setSpeechTranscript('')
      recognitionRef.current?.start()
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onScanError('Please select a valid image file.')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const maxDim = 800 // Reduced from 1080 for faster upload
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim
            width = maxDim
          } else {
            width = (width / height) * maxDim
            height = maxDim
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.4) // Reduced quality to 0.4 for extremely fast upload
            setImagePreview(dataUrl)
            setSelectionRequired(false)
          }
      }
      img.src = reader.result as string
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  // Batch queue handlers
  const handleBatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const newItems = files.map(file => {
        return {
          file,
          preview: URL.createObjectURL(file),
          status: 'pending' as const,
          idempotencyKey: generateClientOpKey('batch')
        }
      })
      setBatchQueue(prev => [...prev, ...newItems])
    }
  }

  const removeBatchItem = (index: number) => {
    setBatchQueue(prev => prev.filter((_, i) => i !== index))
  }

  const handleScanBatch = async () => {
    if (batchQueue.length === 0) return
    setLoading(true)
    onScanStart()
    
    const updatedQueue = [...batchQueue]
    try {
      for (let i = 0; i < updatedQueue.length; i++) {
        if (updatedQueue[i].status === 'success') continue
        updatedQueue[i].status = 'scanning'
        setBatchQueue([...updatedQueue])

        const base64 = await fileToBase64(updatedQueue[i].file)
        const batchIdempotencyKey = updatedQueue[i].idempotencyKey || generateClientOpKey('batch')
        updatedQueue[i].idempotencyKey = batchIdempotencyKey

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Idempotency-Key': batchIdempotencyKey
          },
          body: JSON.stringify({
            image: base64,
            preferences: selectedPrefs,
            filename: updatedQueue[i].file.name,
            idempotencyKey: batchIdempotencyKey
          }),
        })
        const data = await response.json()
        if (response.ok && data.success) {
          updatedQueue[i].status = 'success'
          updatedQueue[i].result = data.analysis
        } else {
          updatedQueue[i].status = 'failed'
        }
        setBatchQueue([...updatedQueue])
      }

      // Automatically recall first successful scan results
      const firstSuccess = updatedQueue.find(item => item.status === 'success')
      if (firstSuccess && firstSuccess.result) {
        onScanSuccess(firstSuccess.result, undefined, firstSuccess.preview || firstSuccess.result?.image_url)
      } else {
        onScanError('Batch scans completed, but all items failed analysis.')
      }
    } catch (err: any) {
      onScanError(err.message || 'Error executing batch analysis.')
    } finally {
      setLoading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Toggle dietary preference
  const togglePreference = (prefId: string) => {
    setActiveOpKey(generateClientOpKey('scan'))
    setSelectedPrefs((prev) =>
      prev.includes(prefId) ? prev.filter((p) => p !== prefId) : [...prev, prefId]
    )
  }

  // Camera operations
  const startCamera = async () => {
    setIsCameraActive(true)
    setImagePreview(null)
    setActiveOpKey(generateClientOpKey('scan'))
    try {
      let stream
      try {
        // Try rear camera first (ideal for mobile)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch (e) {
        // Fallback to any available camera (desktop/laptop) without strict constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        })
      }
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      onScanError('Unable to access camera. Please check your browser permissions or upload an image.')
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  const capturePhoto = () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        onScanError('Camera elements not fully loaded. Please wait a second.')
        return
      }
      
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) {
        onScanError('Could not initialize image capture.')
        return
      }

      // Fallback for mobile browsers where videoWidth might initially be 0
      let width = video.videoWidth || video.clientWidth || 800
      let height = video.videoHeight || video.clientHeight || 800
      
      const maxDim = 800 // Compressed max dimension
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim
          width = maxDim
        } else {
          width = (width / height) * maxDim
          height = maxDim
        }
      }
      
      if (width === 0 || height === 0) {
        onScanError('Camera feed not ready. Please wait.')
        return
      }

      canvas.width = width
      canvas.height = height
      context.drawImage(video, 0, 0, width, height)
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.4) // Aggressive compression for speed
      if (!dataUrl || dataUrl === 'data:,') {
        onScanError('Failed to capture image data.')
        return
      }

      setImagePreview(dataUrl)
      setActiveOpKey(generateClientOpKey('scan'))
      stopCamera()
      setSelectionRequired(false)
    } catch (err: any) {
      console.error('Camera capture error:', err)
      onScanError('Error taking photo: ' + (err.message || 'Unknown error'))
    }
  }

  // Submit scan to backend API
  async function handleScanSubmit(
    overrideImage?: string,
    isDemoScan?: boolean,
    overrideFilename?: string,
    overrideProductName?: string,
    overrideBarcode?: string
  ) {
    const targetImage = overrideImage || imagePreview
    const targetFilename = overrideFilename || fileName
    const targetProductName = overrideProductName !== undefined ? overrideProductName : productNameInput
    const targetBarcode = overrideBarcode || (activeSubTab === 'barcode' ? barcodeInput : '')

    if (!targetImage && !isDemoScan && !targetBarcode) return

    // Pre-flight session check: verify and refresh user session before starting upload
    let activeSession = null
    try {
      const { data: getRes } = await supabase.auth.getSession()
      activeSession = getRes.session
      // If no active session or close to expiration, attempt an immediate refresh
      if (!activeSession?.user) {
        const { data: refreshRes } = await supabase.auth.refreshSession()
        activeSession = refreshRes.session || activeSession
      }
    } catch {
      activeSession = null
    }

    if (!isDemoScan && !activeSession?.user) {
      onScanError('Please sign in to scan food products. You can also explore our Guest Demo without signing in.')
      return
    }

    setLoading(true)
    onScanStart()
    setSelectionRequired(false)

    try {
      const idempotencyKey = activeOpKey || generateClientOpKey('scan')
      
      const authHeader: Record<string, string> = {}
      if (activeSession?.access_token) {
        authHeader['Authorization'] = `Bearer ${activeSession.access_token}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 55000)

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
            ...authHeader
          },
          body: JSON.stringify({
            barcode: targetBarcode || null,
            image: isDemoScan || targetBarcode ? null : targetImage,
            preferences: selectedPrefs,
            isDemo: isDemoScan || false,
            filename: targetFilename,
            productName: targetProductName,
            idempotencyKey
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        const data = await response.json()

        if (!response.ok) {
          if (data.error === 'LIMIT_EXCEEDED') {
            throw new Error('LIMIT_EXCEEDED:' + data.message)
          }
          const errorText = data.message || data.error || 'Failed to analyze product. Please try again.'
          throw new Error(errorText)
        }

        if (data.success === false && data.errorType === 'PRODUCT_SELECTION_REQUIRED') {
          setSelectionRequired(true)
          return
        }

        if (data.success === false && data.errorType === 'BARCODE_NOT_FOUND') {
          throw new Error(data.message)
        }

        // Refresh op key for subsequent scans
        setActiveOpKey(generateClientOpKey('scan'))
        onScanSuccess(data.analysis, data.scanId, targetImage || data.analysis?.image_url || undefined)
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onScanError('Analysis timed out. The server took too long to respond. Please try again.')
      } else {
        onScanError(err.message || 'An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  const clearSelection = () => {
    setImagePreview(null)
    setBarcodeInput('')
    setProductNameInput('')
    setFileName('')
    setBatchQueue([])
    setActiveOpKey(generateClientOpKey('scan'))
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (batchInputRef.current) batchInputRef.current.value = ''
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
      {selectionRequired ? (
        /* Manual Fallback Selection view */
        <div className="flex flex-col gap-6 text-center py-4">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">AI Vision Quota Exhausted</h3>
            <p className="text-zinc-400 text-xs max-w-md leading-relaxed">
              We couldn't automatically read your ingredient label because our AI Vision credits are temporarily depleted. 
              Please select which product you scanned to load the matching safety analysis:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 max-h-[350px] overflow-y-auto pr-1">
            {MOCK_PRESETS.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleScanSubmit(undefined, false, undefined, product.name)}
                className="flex items-center gap-3.5 rounded-xl border border-zinc-850 bg-zinc-950/40 p-3.5 text-left hover:border-emerald-500/40 hover:bg-zinc-900/40 transition group cursor-pointer"
              >
                <div className="text-2xl bg-zinc-900 p-2 rounded-xl border border-zinc-850 group-hover:scale-110 transition duration-200">
                  {product.emoji}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                    {product.name}
                  </h4>
                  <p className="text-[10px] text-zinc-550 mt-0.5">{product.brand}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-zinc-850 pt-5 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setSelectionRequired(false)}
              className="text-[11px] font-bold text-zinc-400 hover:text-white transition cursor-pointer"
            >
              Back to Uploader
            </button>
            <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider">
              ScanSafe Fallback Database
            </span>
          </div>
        </div>
      ) : loading ? (
        /* Loading State */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-8 h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-950"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent"></div>
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-zinc-900">
              <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Analyzing Product</h3>
          <p className="text-zinc-400 max-w-sm text-sm min-h-[40px]">
            {loadingSteps[loadingStep]}
          </p>
          <div className="mt-8 flex gap-1 justify-center w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            {loadingSteps.map((_, i) => (
              <div
                key={i}
                className={`h-full flex-1 transition-all duration-500 ${
                  i <= loadingStep ? 'bg-emerald-400' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Standard Scanner View */
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-emerald-400" /> SCAN PRODUCT LABEL
              </h2>
              <p className="text-zinc-400 text-sm mt-2">
                Upload or snap a photo of the food ingredients list, or{' '}
                <button
                  type="button"
                  onClick={() => handleScanSubmit(undefined, true)}
                  className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  try with a Sample Cereal
                </button>{' '}
                instantly.
              </p>
            </div>

            {/* Drag and drop zone */}
            <div className="relative">
              {isCameraActive ? (
                <div className="relative overflow-hidden rounded-xl border-2 border-emerald-500 bg-black aspect-[4/3] max-h-[380px] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400/50 pointer-events-none rounded-lg flex items-center justify-center">
                    <span className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest bg-black/60 px-4 py-1.5 rounded-md backdrop-blur-sm">
                      Align label inside frame
                    </span>
                  </div>
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-4">
                    <button onClick={stopCamera} className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition"><X className="w-6 h-6" /></button>
                    <button onClick={capturePhoto} className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition"><Camera className="w-7 h-7" /></button>
                  </div>
                </div>
              ) : imagePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 aspect-[4/3] max-h-[380px] flex items-center justify-center">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button onClick={clearSelection} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-800 backdrop-blur-sm transition"><X className="w-5 h-5" /></button>
                  </div>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
                    dragActive ? 'border-emerald-400 bg-emerald-950/20' : 'border-zinc-700 bg-zinc-950/40 hover:border-emerald-500/50 hover:bg-zinc-900/40'
                  }`}
                >
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">Upload Label Photo</h3>
                  <p className="text-zinc-400 text-sm mb-6">Drag and drop, or click to browse</p>
                  <div className="flex gap-4">
                    <button type="button" onClick={(e) => { e.stopPropagation(); startCamera(); }} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"><Camera className="w-5 h-5" /> Take Photo</button>
                  </div>
                </div>
              )}
            </div>

            {/* Diet Preferences Selection */}
            <div className="border-t border-zinc-800 pt-6 mt-2">
              <h3 className="text-sm font-bold text-white mb-3">
                Dietary & Health Profile (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DIETARY_PREFERENCES.map((pref) => {
                  const selected = selectedPrefs.includes(pref.id)
                  return (
                    <button
                      key={pref.id}
                      type="button"
                      onClick={() => togglePreference(pref.id)}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left transition cursor-pointer ${
                        selected
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-black transition ${
                          selected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700 bg-transparent'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold leading-none truncate">{pref.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action Trigger Button */}
            {imagePreview && (
              <button
                data-testid="analyze-btn"
                onClick={() => handleScanSubmit()}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-base font-black tracking-wide text-black hover:bg-emerald-400 transition duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.01]"
              >
                <Sparkles className="w-5 h-5" />
                ANALYZE INGREDIENTS
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
