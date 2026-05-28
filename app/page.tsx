'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Sparkles, Camera, ShieldCheck, ShieldAlert, Heart, Star, ChevronRight, Zap, Check, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
      {/* Navigation Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 lg:pt-36">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 -z-10 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/15 px-3 py-1 text-xs font-bold text-emerald-400 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Powered by Gemini & Claude AI Vision
          </div>

          <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl md:text-7xl leading-tight">
            Stop Guessing. <br />
            Know Exactly What You <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">Eat.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
            Scan ingredients instantly to decode chemical additives, identify health risks, verify FSSAI compliance, and find healthier alternatives.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href={isLoggedIn ? '/scan' : '/auth'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-black px-8 py-4 font-bold text-base hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
            >
              <Camera className="w-5 h-5" /> Start Scanning Free
            </Link>
            <Link
              href="/pitch"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-white px-8 py-4 font-semibold text-base transition"
            >
              <FileText className="w-5 h-5 text-emerald-400" /> View Investor Pitch
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid / Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-zinc-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Why Use ScanSafe?
          </h2>
          <p className="text-zinc-400 mt-3 text-sm">
            Most ingredient labels are deliberately designed to be unreadable. ScanSafe shines a light on what you're buying.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 hover:border-zinc-800 transition duration-300">
            <div className="h-12 w-12 rounded-xl bg-emerald-50/5 flex items-center justify-center text-emerald-400 border border-emerald-500/25 mb-6">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant OCR Extraction</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              No barcode required. Just snap a photo of any ingredient list or nutrition panel. Our AI handles blurred text, low lighting, and torn packaging.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 hover:border-zinc-800 transition duration-300">
            <div className="h-12 w-12 rounded-xl bg-emerald-50/5 flex items-center justify-center text-emerald-400 border border-emerald-500/25 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">FSSAI Compliance Audit</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We check ingredients against FSSAI food regulations in India, calling out warning levels for high sodium, added trans-fats, and hidden sugars.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-8 hover:border-zinc-800 transition duration-300">
            <div className="h-12 w-12 rounded-xl bg-emerald-50/5 flex items-center justify-center text-emerald-400 border border-emerald-500/25 mb-6">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Personalised Risk Score</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Set customized flags for diet restrictions like Jain, Vegan, Gym/High Protein, Diabetics, and Pregnancy. Score is tailored to your body.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-zinc-900 bg-zinc-950/20">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Simple 3-Step Scan
          </h2>
          <p className="text-zinc-400 mt-3 text-sm">
            From checkout counter to ultimate peace of mind in less than 5 seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-black text-emerald-400 mb-6">
              1
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Snap a Photo</h3>
            <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
              Upload an image or use your phone camera directly in the app browser to scan the back of any pack.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-black text-emerald-400 mb-6">
              2
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Analyzes Label</h3>
            <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
              Gemini & Claude scan all listed ingredients, parsing out additives (E-numbers), sugars, oils, and allergens.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl font-black text-emerald-400 mb-6">
              3
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Read Instant Verdict</h3>
            <p className="text-zinc-400 text-xs max-w-xs leading-relaxed">
              Get an overall safety score out of 100, custom warnings, additive explanations, and healthy alternatives.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-zinc-900">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="text-zinc-400 mt-3 text-sm">
            Get started for free or upgrade to Pro for unlimited usage and customized diets.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="rounded-2xl border border-zinc-850 bg-zinc-900/10 p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <h3 className="text-xl font-bold text-white">ScanSafe Free</h3>
              <p className="text-zinc-500 text-xs mt-1">Perfect for trial and light usage</p>
              <div className="my-6">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-zinc-500 text-xs ml-1">/ forever</span>
              </div>
              <ul className="text-zinc-400 text-sm space-y-3.5 border-t border-zinc-850 pt-6">
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                  5 Product scans per day
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                  Ingredient extraction & safety scoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/20 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                  Basic allergen matching
                </li>
              </ul>
            </div>
            <Link
              href={isLoggedIn ? '/scan' : '/auth'}
              className="mt-8 block text-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 py-3 font-semibold hover:border-zinc-700 hover:bg-zinc-850 transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="relative rounded-2xl border-2 border-emerald-500 bg-zinc-900/20 p-8 flex flex-col justify-between shadow-lg shadow-emerald-500/5">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-extrabold text-black uppercase tracking-wider">
              Popular Choice
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                ScanSafe Pro <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              </h3>
              <p className="text-zinc-400 text-xs mt-1">For proactive health advocates</p>
              <div className="my-6">
                <span className="text-4xl font-black text-white">₹499</span>
                <span className="text-zinc-500 text-xs ml-1">/ one-time payment</span>
              </div>
              <ul className="text-zinc-300 text-sm space-y-3.5 border-t border-zinc-850/30 pt-6">
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/25 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                  <span className="font-semibold text-white">Unlimited daily scans</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/25 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                  Unlimited scan history storage
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/25 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                  Custom dietary preference triggers
                </li>
                <li className="flex items-center gap-2">
                  <div className="rounded-full bg-emerald-500/25 text-emerald-400 p-0.5"><Check className="w-3.5 h-3.5" /></div>
                  Premium alternatives sourcing
                </li>
              </ul>
            </div>
            <Link
              href="/pricing"
              className="mt-8 block text-center rounded-xl bg-emerald-500 text-black py-3 font-bold hover:bg-emerald-400 transition"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border-t border-zinc-900/60 text-center text-zinc-500 text-xs">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} ScanSafe. All rights reserved. Safeguarding diets, one label at a time.</p>
      </footer>
    </div>
  )
}
