'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { getAllPacks, SCAN_PACKS, LIVE_PAYMENTS_ENABLED } from '@/lib/plans'
import { Sparkles, Check, CreditCard, RefreshCw, Star, Zap, ShieldCheck, Shield, Smartphone, QrCode, X, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

// Load script helper
function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<string>('free')
  const [planType, setPlanType] = useState<string>('free')
  const [upgrading, setUpgrading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('pack_100')
  const [showManualModal, setShowManualModal] = useState(false)
  const [utr, setUtr] = useState('')
  const [submittingUtr, setSubmittingUtr] = useState(false)

  const packs = getAllPacks()
  const selectedPack = SCAN_PACKS[selectedPeriod] || packs[1]

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetch('/api/profile/ensure', { method: 'POST' })
        fetchUserProfile(currentUser.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchUserProfile(currentUser.id)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, plan_type, plan_expires_at')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        const now = new Date()
        const expired = data.plan === 'pro' && data.plan_expires_at && new Date(data.plan_expires_at) <= now
        if (expired) {
          data.plan = 'free'
          data.plan_type = 'free'
          data.plan_expires_at = null
        }
        setPlan(data.plan || 'free')
        setPlanType(data.plan_type || 'free')
      }
    } catch (e) {
      console.error('Error loading user profile:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleManualUpgrade = async () => {
    if (!LIVE_PAYMENTS_ENABLED) {
      alert('Manual payment submissions are currently disabled pending production verification. Please use the zero-credit sample demo.')
      return
    }

    if (!user) {
      router.push('/auth')
      return
    }
    if (utr.trim().length < 8) {
      alert('Please enter a valid UTR number (at least 8 characters).')
      return
    }

    setSubmittingUtr(true)
    try {
      const targetPack = SCAN_PACKS[selectedPeriod] || packs[1]
      const res = await fetch('/api/manual-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          planType: targetPack.id,
          amount: targetPack.priceInr,
          utr: utr.trim()
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit payment verification.')
      }

      setShowManualModal(false)
      setIsSuccess(true)
      setPlan('pro')
      setPlanType(selectedPeriod)
      setTimeout(() => {
        router.push('/scan')
      }, 3000)
    } catch (err: any) {
      console.error('Manual checkout error:', err)
      alert(err.message || 'An error occurred submitting your UTR.')
    } finally {
      setSubmittingUtr(false)
    }
  }

  const handleUpgrade = async (planTypeParam: string) => {
    if (!LIVE_PAYMENTS_ENABLED) {
      alert('Live payment checkout is currently disabled pending production gateway verification. Please use the zero-credit sample demo.')
      return
    }

    if (!user) {
      router.push('/auth')
      return
    }

    setUpgrading(true)
    try {
      // Load Razorpay Script
      const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js')
      if (!isLoaded) {
        alert('Failed to load Razorpay payment gateway. Please check your internet connection.')
        setUpgrading(false)
        return
      }

      // Create order via backend API
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: planTypeParam, planType: planTypeParam })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to initialize payment order.')
      }

      const targetPack = SCAN_PACKS[planTypeParam] || packs[1]

      // Open Razorpay Options
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'ScanSafe Pro',
        description: `Upgrade to ${targetPack.name} (${targetPack.scans} Scans)`,
        order_id: data.orderId,
        prefill: {
          name: data.user.name || '',
          email: data.user.email || '',
        },
        theme: {
          color: '#10b981', // emerald-500
        },
        handler: async function (_response: any) {
          setIsSuccess(true)
          setPlan('pro')
          setPlanType(planTypeParam)
          setTimeout(() => {
            router.push('/scan')
          }, 3000)
        },
        modal: {
          ondismiss: function () {
            setUpgrading(false)
          },
        },
      }

      const rzp = (window as any).Razorpay ? new (window as any).Razorpay(options) : null
      if (rzp) {
        rzp.open()
      } else {
        throw new Error('Razorpay client not found.')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      alert(err.message || 'An error occurred during payment setup.')
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-zinc-500 text-sm mt-3">Loading membership options...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 flex flex-col items-center">
        {isSuccess ? (
          /* Checkout Success Feedback */
          <div className="text-center py-20 max-w-md border border-zinc-850 rounded-2xl bg-zinc-900/10 p-8 shadow-xl shadow-emerald-500/5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-white">Upgrade Successful!</h2>
            <p className="text-emerald-400 font-bold mt-2 flex items-center gap-1.5 justify-center text-sm">
              <Star className="w-4 h-4 fill-emerald-400" /> Welcome to ScanSafe Pro
            </p>
            <p className="text-zinc-400 text-sm mt-4 leading-relaxed">
              Your account has been credited. You have unlocked comprehensive scan credits, personalized allergen warnings, and premium history records.
            </p>
            <p className="text-zinc-500 text-xs mt-8">Redirecting you to the dashboard...</p>
          </div>
        ) : (
          /* Normal pricing state */
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Header banner */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Choose Your <span className="text-emerald-400">Health Journey</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
                ScanSafe helps you shop smart and eat healthy. All scan packs feature lifetime validity with no subscription lock-in.
              </p>
            </div>

            {/* Prototype Demo Notice when live payments are unverified */}
            {!LIVE_PAYMENTS_ENABLED && (
              <div className="mb-8 w-full max-w-3xl rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs text-amber-200 flex flex-col sm:flex-row items-center justify-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-left">
                  <span className="font-bold text-amber-300">Prototype Demonstration Mode:</span> Live payment gateway processing is awaiting production database verification. New paid checkouts are temporarily disabled for this submission. You can test our zero-credit sample label analysis freely without signing in.
                </div>
                <button
                  onClick={() => router.push('/demo')}
                  className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-300 transition cursor-pointer"
                >
                  Try Sample Demo
                </button>
              </div>
            )}

            {/* Plan Display cards */}
            <div className="grid md:grid-cols-2 gap-8 w-full">
              {/* Free Plan */}
              <div className="rounded-2xl border border-zinc-850 bg-zinc-900/10 p-8 flex flex-col justify-between relative overflow-hidden">
                {plan === 'free' && (
                  <div className="absolute top-3.5 right-3.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-400 px-2 py-0.5 uppercase tracking-wider">
                    5 Free Scans
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">ScanSafe Free</h3>
                  <p className="text-zinc-500 text-xs mt-1">Perfect for trial and light usage</p>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-black text-white">₹0</span>
                    <span className="text-zinc-400 font-medium">/starter</span>
                  </div>
                  
                  <div className="h-[1px] bg-zinc-850 my-6" />

                  <ul className="text-zinc-400 text-sm space-y-4">
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      5 initial lifetime scans
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      Extraction of raw ingredients list
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      Standard allergy notifications
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      Interactive zero-credit sample demo
                    </li>
                  </ul>
                </div>
                
                <button
                  disabled={plan === 'free'}
                  onClick={() => router.push('/scan')}
                  className="mt-8 w-full text-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 py-3 text-sm font-semibold hover:border-zinc-700 hover:text-white transition disabled:cursor-not-allowed disabled:hover:border-zinc-800 disabled:opacity-50"
                >
                  {plan === 'free' ? 'Active Plan' : 'Go to Dashboard'}
                </button>
              </div>

              {/* Pro Plan */}
              <div className="relative rounded-2xl border-2 border-emerald-500 bg-zinc-900/20 p-8 flex flex-col justify-between shadow-lg shadow-emerald-500/5 overflow-hidden">
                {plan === 'pro' ? (
                  <div className="absolute top-3.5 right-3.5 rounded bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider flex items-center gap-0.5">
                    <Zap className="w-3 h-3 fill-black" /> Refill Credits
                  </div>
                ) : (
                  <div className="absolute top-3.5 right-3.5 rounded bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                    Official Catalog
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                    ScanSafe Pro <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  </h3>
                  <p className="text-zinc-400 text-xs mt-1">Direct pay-per-pack credits with lifetime validity</p>
                  
                  {/* Dynamic Price Display */}
                  <div className="my-6">
                    <span className="text-4xl font-black text-white">₹{selectedPack.priceInr}</span>
                    <span className="text-zinc-400 text-xs ml-2">
                      for {selectedPack.scans} scans ({selectedPack.tag})
                    </span>
                  </div>

                  <div className="h-[1px] bg-zinc-850 my-6" />

                  {/* Plan Selector */}
                  <div className="mb-8">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-3">
                      Select Scan Pack (Official INR Pricing)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {packs.map((p) => {
                        const isSelected = selectedPeriod === p.id
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPeriod(p.id)}
                            className={`flex flex-col justify-between items-start rounded-xl border p-3 text-left transition cursor-pointer relative ${
                              isSelected
                                ? 'bg-emerald-950/20 border-emerald-500 text-white shadow-md shadow-emerald-500/5'
                                : 'bg-zinc-950/40 border-zinc-850 text-zinc-300 hover:border-zinc-850'
                            }`}
                          >
                            <div className="flex w-full justify-between items-center gap-1.5">
                              <span className="font-bold text-xs truncate">{p.name}</span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 ${
                                isSelected ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {p.tag || `₹${p.priceInr}`}
                              </span>
                            </div>
                            <div className="mt-2 flex items-baseline">
                              <span className="text-lg font-black">₹{p.priceInr}</span>
                              <span className="text-[9px] text-zinc-500 ml-1">({p.scans} credits)</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <ul className="text-zinc-300 text-sm space-y-4">
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      <span className="font-semibold text-white">Full scan history browser</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      Custom diet preference warning profiles
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      Side-by-side product comparison & meal composer
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      {(selectedPeriod === 'pack_320' || selectedPeriod === 'pack_1200') ? 'Advanced Additive & Toxicology Deep Dives' : 'Standard Email Support'}
                    </li>
                  </ul>
                </div>

                <button
                  disabled={upgrading || !LIVE_PAYMENTS_ENABLED}
                  onClick={() => handleUpgrade(selectedPeriod)}
                  className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-black py-3.5 text-sm font-bold hover:bg-emerald-400 transition disabled:bg-zinc-900 disabled:border disabled:border-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                >
                  {upgrading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Initializing Gateway...
                    </>
                  ) : !LIVE_PAYMENTS_ENABLED ? (
                    <>
                      <CreditCard className="w-4 h-4" /> Live Payments Awaiting Verification
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> Purchase {selectedPack.name} (₹{selectedPack.priceInr})
                    </>
                  )}
                </button>

                {LIVE_PAYMENTS_ENABLED ? (
                  <button
                    disabled={upgrading}
                    onClick={() => setShowManualModal(true)}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-transparent border border-emerald-500/50 text-emerald-400 py-3.5 text-sm font-bold hover:bg-emerald-500/10 transition disabled:border-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed"
                  >
                    <QrCode className="w-4 h-4" /> Pay directly via UPI QR
                  </button>
                ) : (
                  <button
                    onClick={() => router.push('/scan')}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-transparent border border-emerald-500/50 text-emerald-400 py-3.5 text-sm font-bold hover:bg-emerald-500/10 transition"
                  >
                    <Sparkles className="w-4 h-4" /> Try Zero-Credit Sample Demo
                  </button>
                )}

                {/* Trust Badges */}
                <div className="mt-6 pt-5 border-t border-zinc-800/50 flex flex-col items-center gap-3">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    Powered by <span className="text-white font-bold tracking-tight text-xs flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" /> Razorpay</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                       <Smartphone className="w-4 h-4" /> UPI Apps
                     </div>
                     <div className="text-xs font-medium text-zinc-500 flex items-center gap-1">
                       <CreditCard className="w-4 h-4" /> Cards & NetBanking
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual UPI QR Modal */}
      {showManualModal && LIVE_PAYMENTS_ENABLED && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative flex flex-col items-center">
            <button
              onClick={() => setShowManualModal(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">Direct UPI Payment</h3>
            <p className="text-sm text-zinc-400 mb-6 text-center">
              Scan with any UPI app to upgrade instantly.
            </p>

            <div className="bg-white p-4 rounded-xl mb-6 flex justify-center">
              <Image 
                src="/razorpay-qr.jpg" 
                alt="Razorpay UPI QR" 
                width={200} 
                height={300} 
                className="w-auto h-auto max-h-[300px] object-contain"
              />
            </div>

            <div className="w-full space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  Enter UTR Number
                </label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 30))}
                  placeholder="e.g., 312345678901"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleManualUpgrade}
                disabled={submittingUtr || utr.length < 8}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-black py-3 text-sm font-bold hover:bg-emerald-400 transition disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
              >
                {submittingUtr ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</>
                ) : (
                  'Confirm Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
