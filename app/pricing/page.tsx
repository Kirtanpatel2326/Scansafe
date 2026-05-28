'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Sparkles, Check, CreditCard, RefreshCw, Star, Zap, ShieldCheck, Shield, Smartphone } from 'lucide-react'

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
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('year')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        // Ensure profile exists
        await fetch('/api/profile/ensure', { method: 'POST' })
        fetchUserProfile(user.id)
      } else {
        setLoading(false)
      }
    })
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

  const handleUpgrade = async (planTypeParam: 'day' | 'week' | 'month' | 'year') => {
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
        body: JSON.stringify({ planType: planTypeParam })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment order.')
      }

      const planNameMap = {
        day: '1-Day Pass',
        week: 'Weekly Pass',
        month: 'Monthly Pro',
        year: 'Yearly Pro'
      }

      // Open Razorpay Options
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'ScanSafe Pro',
        description: `Upgrade to ScanSafe ${planNameMap[planTypeParam]}`,
        order_id: data.orderId,
        prefill: {
          name: data.user.name || '',
          email: data.user.email || '',
        },
        theme: {
          color: '#10b981', // emerald-500
        },
        handler: async function (response: any) {
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
              Your account is now upgraded to Pro. You have unlocked unlimited daily scans, personalized allergen warnings, and premium history records.
            </p>
            <p className="text-zinc-500 text-xs mt-8">Redirecting you to the dashboard...</p>
          </div>
        ) : (
          /* Normal pricing state */
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Header banner */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Choose Your <span className="text-emerald-400">Health Journey</span>
              </h1>
              <p className="text-zinc-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
                ScanSafe helps you shop smart and eat healthy. Choose the plan that fits your shopping frequency.
              </p>
            </div>

            {/* Plan Display cards */}
            <div className="grid md:grid-cols-2 gap-8 w-full">
              {/* Free Plan */}
              <div className="rounded-2xl border border-zinc-850 bg-zinc-900/10 p-8 flex flex-col justify-between relative overflow-hidden">
                {plan === 'free' && (
                  <div className="absolute top-3.5 right-3.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-zinc-400 px-2 py-0.5 uppercase tracking-wider">
                    Current Plan
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">ScanSafe Free</h3>
                  <p className="text-zinc-500 text-xs mt-1">Perfect for trial and light usage</p>
                  <div className="my-6">
                    <span className="text-4xl font-black text-white">$0</span>
                    <span className="text-zinc-500 text-xs ml-1">/ forever</span>
                  </div>
                  
                  <div className="h-[1px] bg-zinc-850 my-6" />

                  <ul className="text-zinc-400 text-sm space-y-4">
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      5 scans daily
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      Extraction of raw ingredients list
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                      Standard allergy notifications
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
              {(() => {
                const periods = [
                  { id: 'day', name: 'Daily Pass', price: 10, period: '/ day', desc: '1 Day of unlimited scans', savings: 'Quick Trial' },
                  { id: 'week', name: 'Weekly Pass', price: 99, period: '/ week', desc: '7 Days of unlimited scans', savings: 'Save 70%' },
                  { id: 'month', name: 'Monthly Pro', price: 299, period: '/ month', desc: '30 Days of unlimited scans', savings: 'Save 90%' },
                  { id: 'year', name: 'Yearly Pro', price: 999, period: '/ year', desc: '365 Days of unlimited scans', savings: 'Best Value ⭐' },
                ] as const

                const activePeriod = periods.find(p => p.id === selectedPeriod) || periods[3]

                return (
                  <div className="relative rounded-2xl border-2 border-emerald-500 bg-zinc-900/20 p-8 flex flex-col justify-between shadow-lg shadow-emerald-500/5 overflow-hidden">
                    {plan === 'pro' ? (
                      <div className="absolute top-3.5 right-3.5 rounded bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider flex items-center gap-0.5">
                        <Zap className="w-3 h-3 fill-black" /> Current Plan ({planType})
                      </div>
                    ) : (
                      <div className="absolute top-3.5 right-3.5 rounded bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        Best Value
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                        ScanSafe Pro <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                      </h3>
                      <p className="text-zinc-400 text-xs mt-1">Unlock the full power of food analysis with flexible options</p>
                      
                      {/* Dynamic Price Display */}
                      <div className="my-6">
                        <span className="text-4xl font-black text-white">₹{activePeriod.price}</span>
                        <span className="text-zinc-500 text-xs ml-1">
                          {activePeriod.period}
                        </span>
                      </div>

                      <div className="h-[1px] bg-zinc-850 my-6" />

                      {/* Plan Selector */}
                      <div className="mb-8">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-3">
                          Select Subscription Period
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {periods.map((p) => {
                            const isSelected = selectedPeriod === p.id
                            const isActiveSubscription = plan === 'pro' && planType === p.id
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
                                    {p.savings}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-baseline">
                                  <span className="text-lg font-black">₹{p.price}</span>
                                  <span className="text-[9px] text-zinc-500 ml-1">{p.period}</span>
                                </div>
                                {isActiveSubscription && (
                                  <div className="absolute bottom-1 right-2 text-[8px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-0.5 bg-black/45 px-1 rounded">
                                    <Check className="w-2.5 h-2.5" /> Active
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <ul className="text-zinc-300 text-sm space-y-4">
                        <li className="flex items-center gap-2.5">
                          <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                          <span className="font-semibold text-white">Unlimited daily scans</span>
                        </li>
                        <li className="flex items-center gap-2.5">
                          <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                          Full scan history browser
                        </li>
                        <li className="flex items-center gap-2.5">
                          <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                          Custom diet preference warning profiles
                        </li>
                        <li className="flex items-center gap-2.5">
                          <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                          AI-generated healthy alternatives recommendations
                        </li>
                      </ul>
                    </div>

                    <button
                      disabled={(plan === 'pro' && planType === selectedPeriod) || upgrading}
                      onClick={() => handleUpgrade(selectedPeriod)}
                      className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-black py-3.5 text-sm font-bold hover:bg-emerald-400 transition disabled:bg-zinc-900 disabled:border disabled:border-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                    >
                      {upgrading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Initializing Gateway...
                        </>
                      ) : plan === 'pro' && planType === selectedPeriod ? (
                        'Active Plan Selected'
                      ) : plan === 'pro' ? (
                        `Change Plan to ${activePeriod.name}`
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" /> Subscribe to {activePeriod.name}
                        </>
                      )}
                    </button>

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
                )
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
