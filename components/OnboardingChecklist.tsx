'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, Circle, X } from 'lucide-react'

export default function OnboardingChecklist() {
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  // Use localStorage to remember if user dismissed it
  useEffect(() => {
    const dismissed = localStorage.getItem('scansafe_onboarding_dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  if (isDismissed || !isVisible) return null

  const dismiss = () => {
    setIsVisible(false)
    localStorage.setItem('scansafe_onboarding_dismissed', 'true')
  }

  return (
    <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-5 mb-8 relative">
      <button 
        onClick={dismiss}
        className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <h3 className="text-emerald-400 font-semibold text-lg mb-2">Welcome to ScanSafe! 🚀</h3>
      <p className="text-zinc-400 text-sm mb-4">Complete these quick steps to master your food safety:</p>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-zinc-300 text-sm line-through opacity-70">Create your account</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Circle className="w-5 h-5 text-zinc-600" />
          <span className="text-zinc-200 text-sm">Scan your very first ingredient list</span>
        </div>

        <div className="flex items-center gap-3">
          <Circle className="w-5 h-5 text-zinc-600" />
          <span className="text-zinc-200 text-sm">Export a PDF report to share with family</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Circle className="w-5 h-5 text-zinc-600" />
          <span className="text-zinc-200 text-sm">Upgrade to ScanSafe Pro for unlimited scans</span>
        </div>
      </div>
    </div>
  )
}
