'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Sparkles, Check, CreditCard, RefreshCw, Star, Zap, ShieldCheck } from 'lucide-react'

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
  const [upgrading, setUpgrading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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
        .select('plan')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setPlan(data.plan || 'free')
      }
    } catch (e) {
      console.error('Error loading user profile:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
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
      const res = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment order.')
      }

      // Open Razorpay Options
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'ScanSafe Pro',
        description: 'Upgrade for Unlimited Scans',
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
          // Optional: Verify signature on backend if needed, but since webhook will process it:
          // We can immediately update local UI state and redirect after a delay
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
              <div className="relative rounded-2xl border-2 border-emerald-500 bg-zinc-900/20 p-8 flex flex-col justify-between shadow-lg shadow-emerald-500/5 overflow-hidden">
                {plan === 'pro' ? (
                  <div className="absolute top-3.5 right-3.5 rounded bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider flex items-center gap-0.5">
                    <Zap className="w-3 h-3 fill-black" /> Current Plan
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
                  <p className="text-zinc-400 text-xs mt-1">Unlock the full power of food analysis (₹1 trial promo)</p>
                  
                  <div className="my-6">
                    <span className="text-4xl font-black text-white">₹1</span>
                    <span className="text-zinc-500 text-xs ml-1">/ trial checkout</span>
                  </div>

                  <div className="h-[1px] bg-zinc-850 my-6" />

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
                  disabled={plan === 'pro' || upgrading}
                  onClick={handleUpgrade}
                  className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-black py-3 text-sm font-bold hover:bg-emerald-400 transition disabled:bg-zinc-900 disabled:border disabled:border-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
                >
                  {upgrading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Initializing Gateway...
                    </>
                  ) : plan === 'pro' ? (
                    'Pro Account Active'
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" /> Upgrade to Pro
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
