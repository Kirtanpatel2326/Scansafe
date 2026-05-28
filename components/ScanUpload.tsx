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

interface ScanUploadProps {
  onScanStart: () => void
  onScanSuccess: (result: any, scanId?: string) => void
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

export default function ScanUpload({ onScanStart, onScanSuccess, onScanError }: ScanUploadProps) {
  const [activeSubTab, setActiveSubTab] = useState<'vision' | 'barcode' | 'batch'>('vision')
  const [dragActive, setDragActive] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([])
  const [productNameInput, setProductNameInput] = useState('')
  const [fileName, setFileName] = useState('')
  const [selectionRequired, setSelectionRequired] = useState(false)
  
  // Barcode search input
  const [barcodeInput, setBarcodeInput] = useState('')

  // Batch queue
  const [batchQueue, setBatchQueue] = useState<Array<{ file: File, preview: string, status: 'pending' | 'scanning' | 'success' | 'failed', result?: any }>>([])
  
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
    'Initializing ScanSafe ULTRA Intelligence...',
    'Decoding barcode indexes / running Vision OCR...',
    'Querying food science database & additives register...',
    'Evaluating heavy metals & microplastics toxicity risks...',
    'Sourcing clean alternatives from Blinkit / BigBasket...',
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loading) {
      setLoadingStep(0)
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev))
      }, 2000)
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
      const dataUrl = reader.result as string
      setImagePreview(dataUrl)
      setSelectionRequired(false)
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
          status: 'pending' as const
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
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            preferences: selectedPrefs,
            filename: updatedQueue[i].file.name
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
        onScanSuccess(firstSuccess.result)
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
    setSelectedPrefs((prev) =>
      prev.includes(prefId) ? prev.filter((p) => p !== prefId) : [...prev, prefId]
    )
  }

  // Camera operations
  const startCamera = async () => {
    setIsCameraActive(true)
    setImagePreview(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      onScanError('Unable to access camera. Please upload an image instead.')
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
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        const dataUrl = canvas.toDataURL('image/jpeg')
        setImagePreview(dataUrl)
        stopCamera()
        setSelectionRequired(false)
      }
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

    setLoading(true)
    onScanStart()
    setSelectionRequired(false)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: targetBarcode || null,
          image: isDemoScan || targetBarcode ? null : targetImage,
          preferences: selectedPrefs,
          isDemo: isDemoScan || false,
          filename: targetFilename,
          productName: targetProductName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'LIMIT_EXCEEDED') {
          throw new Error('LIMIT_EXCEEDED:' + data.message)
        }
        throw new Error(data.error || 'Failed to analyze product. Please try again.')
      }

      if (data.success === false && data.errorType === 'PRODUCT_SELECTION_REQUIRED') {
        setSelectionRequired(true)
        return
      }

      if (data.success === false && data.errorType === 'BARCODE_NOT_FOUND') {
        throw new Error(data.message)
      }

      onScanSuccess(data.analysis, data.scanId)
    } catch (err: any) {
      onScanError(err.message || 'An unexpected error occurred.')
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
        /* Standard Scanner tab selector views */
        <div className="flex flex-col gap-6">
          {/* Sub Navigation */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex gap-2">
              <button
                onClick={() => { clearSelection(); setActiveSubTab('vision'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSubTab === 'vision' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5 inline mr-1" /> Label Photo
              </button>
              <button
                onClick={() => { clearSelection(); setActiveSubTab('barcode'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSubTab === 'barcode' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Barcode className="w-3.5 h-3.5 inline mr-1" /> Barcode Scan
              </button>
              <button
                onClick={() => { clearSelection(); setActiveSubTab('batch'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeSubTab === 'batch' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 inline mr-1" /> Batch Scans
              </button>
            </div>

            {/* Voice Control MIC */}
            {recognitionRef.current && (
              <button
                type="button"
                onClick={toggleVoiceListening}
                className={`p-2 rounded-full border transition flex items-center gap-1.5 text-xs font-bold ${
                  isListening 
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="Trigger Voice Control"
              >
                {isListening ? <Mic className="w-4 h-4 animate-bounce" /> : <MicOff className="w-4 h-4" />}
                <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Voice control'}</span>
              </button>
            )}
          </div>

          {speechTranscript && (
            <div className="bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-400 text-center">
              Voice Heard: <strong className="text-white italic">"{speechTranscript}"</strong>
            </div>
          )}

          {/* TAB 1: VISION UPLOADER */}
          {activeSubTab === 'vision' && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> Choose Label Photo
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
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

              {/* Product Name Inputs */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400">
                    Product Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={productNameInput}
                    onChange={(e) => setProductNameInput(e.target.value)}
                    placeholder="e.g. Lotte Choco Pie, Oreo, Coca-Cola..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition duration-150"
                  />
                </div>
              </div>

              {/* Drag and drop zone */}
              <div className="relative">
                {isCameraActive ? (
                  <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black aspect-[4/3] max-h-[380px] flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-8 border border-dashed border-emerald-400/50 pointer-events-none rounded-lg flex items-center justify-center">
                      <span className="text-[10px] text-emerald-400/60 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded">
                        Align packaging label here
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                      <button onClick={stopCamera} className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X className="w-5 h-5" /></button>
                      <button onClick={capturePhoto} className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black hover:bg-emerald-400 transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"><Camera className="w-6 h-6" /></button>
                    </div>
                  </div>
                ) : imagePreview ? (
                  <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 aspect-[4/3] max-h-[380px] flex items-center justify-center">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button onClick={clearSelection} className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-850"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                      dragActive ? 'border-emerald-400 bg-emerald-950/10' : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-700 hover:bg-zinc-900/10'
                    }`}
                  >
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-zinc-200 font-semibold text-sm">Drag label photo, or <span className="text-emerald-400 hover:underline">browse</span></p>
                    <p className="text-zinc-500 text-xs mt-1">PNG, JPG, WEBP</p>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); startCamera(); }} className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-350 hover:bg-zinc-800 hover:text-white"><Camera className="w-4 h-4" /> Camera</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BARCODE ENRICHMENT SEARCH */}
          {activeSubTab === 'barcode' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-emerald-400" /> Barcode Database Search
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                  Query product codes instantly. Bypasses Vision costs using Cached audits or Open Food Facts indexes.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter EAN/UPC product barcode (e.g. 8901058860269)..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleScanSubmit(undefined, false, undefined, undefined, barcodeInput)}
                  disabled={!barcodeInput}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-850 disabled:text-zinc-500 text-black font-bold px-6 rounded-xl text-sm transition shrink-0"
                >
                  Search
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Audited Code Presets:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {MOCK_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setBarcodeInput(p.barcode)
                        handleScanSubmit(undefined, false, undefined, p.name, p.barcode)
                      }}
                      className="flex items-center gap-2.5 rounded-lg border border-zinc-850 bg-zinc-950/20 p-2.5 text-left hover:border-emerald-500/30 transition text-xs cursor-pointer"
                    >
                      <span>{p.emoji}</span>
                      <div className="min-w-0">
                        <strong className="text-zinc-200 block truncate">{p.name}</strong>
                        <span className="text-[10px] text-zinc-550 block font-mono">{p.barcode}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BATCH SCAN QUEUE */}
          {activeSubTab === 'batch' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-emerald-400" /> Batch Scanning Queue
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                  Upload multiple labels to run parallel toxicology evaluations in series.
                </p>
              </div>

              <div className="border-2 border-dashed border-zinc-850 rounded-xl p-8 text-center bg-zinc-950/10 hover:border-zinc-800 transition cursor-pointer" onClick={() => batchInputRef.current?.click()}>
                <input ref={batchInputRef} type="file" multiple onChange={handleBatchFileChange} accept="image/*" className="hidden" />
                <Upload className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                <span className="text-zinc-300 font-bold text-xs block">Choose Multiple Images</span>
                <span className="text-zinc-550 text-[10px] block mt-0.5">Hold Ctrl/Cmd to select multiple files</span>
              </div>

              {batchQueue.length > 0 && (
                <div className="flex flex-col gap-2.5 border-t border-zinc-800 pt-4">
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>Queue Items: {batchQueue.length}</span>
                    <button type="button" onClick={clearSelection} className="text-rose-400 font-bold hover:underline">Clear Queue</button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {batchQueue.map((item, idx) => (
                      <div key={idx} className="bg-zinc-950/30 border border-zinc-850 rounded-lg p-2.5 flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={item.preview} className="h-9 w-9 object-cover rounded border border-zinc-800 shrink-0" />
                          <span className="text-zinc-200 block truncate pr-2">{item.file.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'success' ? 'text-emerald-400' :
                            item.status === 'scanning' ? 'text-amber-400 animate-pulse' :
                            item.status === 'failed' ? 'text-rose-400' : 'text-zinc-500'
                          }`}>
                            {item.status}
                          </span>
                          <button onClick={() => removeBatchItem(idx)} className="text-zinc-550 hover:text-zinc-200 p-1"><X className="w-3.5 h-3.5 cursor-pointer" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleScanBatch}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3 rounded-xl text-sm transition"
                  >
                    Analyze Queue ({batchQueue.filter(i=>i.status !== 'success').length} pending)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Diet Preferences Selection */}
          {activeSubTab === 'vision' && (
            <div className="border-t border-zinc-800 pt-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-1.5">
                Customize Dietary Warnings
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
                          ? 'border-emerald-500/40 bg-emerald-950/15 text-emerald-400'
                          : 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/10'
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-black transition ${
                          selected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700 bg-transparent'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-medium leading-none truncate">{pref.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          {activeSubTab === 'vision' && imagePreview && (
            <button
              onClick={() => handleScanSubmit()}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-black hover:bg-emerald-400 transition duration-200 shadow-lg shadow-emerald-500/10"
            >
              Analyze Ingredient Label
            </button>
          )}
        </div>
      )}
    </div>
  )
}
