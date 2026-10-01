'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Camera, X, Search, AlertCircle, ScanBarcode, ArrowRight } from 'lucide-react'

interface BarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onBarcodeDetected: (barcode: string) => void
  onFallbackToCameraScan: () => void
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onBarcodeDetected,
  onFallbackToCameraScan
}: BarcodeScannerModalProps) {
  const [manualBarcode, setManualBarcode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      return
    }

    startCamera()

    return () => {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    setCameraError(null)
    setIsScanning(true)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser. Please enter barcode manually.')
        setIsScanning(false)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        scanLoop()
      }
    } catch (err: any) {
      console.warn('Camera barcode initialization error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. You can enter the barcode manually or take a label photo.')
      } else {
        setCameraError('Unable to access camera. Please enter barcode manually below.')
      }
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const scanLoop = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(scanLoop)
      return
    }

    // Check if BarcodeDetector API is natively supported
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code']
        })
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes && barcodes.length > 0) {
          const detected = barcodes[0].rawValue?.trim()
          if (detected) {
            stopCamera()
            onBarcodeDetected(detected)
            return
          }
        }
      } catch (err) {
        // Fall back to scanning loop
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanLoop)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualBarcode.trim()
    if (!trimmed) return
    stopCamera()
    onBarcodeDetected(trimmed)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Barcode Scanner</h3>
              <p className="text-xs text-zinc-400">Point at product barcode or type numbers</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera()
              onClose()
            }}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport or Error */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-300 mb-2 font-medium">{cameraError}</p>
              <p className="text-xs text-zinc-500">You can type the barcode below or upload label photos.</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Aiming Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-emerald-500/60 rounded-xl relative shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-rose-500/80 animate-pulse" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Manual Barcode Input */}
        <div className="p-5 space-y-4">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">
              Manual Barcode Entry (EAN / UPC)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="e.g. 8901262010107"
                pattern="[0-9A-Za-z-]+"
                className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition flex items-center gap-1.5"
              >
                <span>Lookup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Fallback to label photo */}
          <div className="pt-2 border-t border-zinc-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                stopCamera()
                onClose()
                onFallbackToCameraScan()
              }}
              className="text-xs text-zinc-400 hover:text-emerald-400 transition inline-flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Barcode unreadable or missing? Scan label photo instead</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
