'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import ArDemo from '@/components/ArDemo'
import { 
  Sparkles, 
  Camera, 
  ShieldCheck, 
  ChevronRight, 
  Zap, 
  Check, 
  FileText, 
  Activity, 
  AlertTriangle, 
  Fingerprint, 
  Search, 
  ArrowRight, 
  ShieldAlert, 
  ShoppingBag, 
  Lock, 
  Microscope, 
  RefreshCw, 
  Layers,
  HeartPulse,
  Baby,
  ActivitySquare
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion, useScroll, useTransform, Variants } from 'framer-motion'
import { useTranslation } from '@/lib/translations'

export default function LandingPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { scrollYProgress } = useScroll()
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const [lang, setLang] = useState('en')

  useEffect(() => {
    const getCookie = (name: string): string => {
      if (typeof window === 'undefined') return 'en'
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '')
      return 'en'
    }
    setLang(getCookie('preferred_lang') || 'en')
  }, [])

  const t = useTranslation(lang)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      
      const email = session?.user?.email?.toLowerCase()
      const isAdmin = email && ['kirtanpatel2326@gmail.com', 'kirtanpatel2305@gmail.com'].includes(email)
      
      if (!isAdmin) {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/' })
        }).catch(console.error)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Animation Variants
  const containerVars: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.15 }
    }
  }

  const itemVars: Variants = {
    hidden: { opacity: 0, y: 25 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60 } }
  }

  const fadeUpVars: Variants = {
    hidden: { opacity: 0, y: 35 },
    whileInView: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black overflow-hidden font-sans">
      <Header />

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-28 overflow-hidden flex flex-col items-center justify-center min-h-[92vh]">
        {/* Dynamic Aurora Background */}
        <motion.div style={{ y: yBg }} className="absolute inset-0 -z-10 flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }} 
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 h-[550px] w-[550px] rounded-full bg-emerald-600/20 blur-[160px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.45, 0.25] }} 
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/3 left-1/4 h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[150px]" 
          />
        </motion.div>

        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10"
        >
          {/* Main Top Badge */}
          <motion.div variants={itemVars} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-emerald-300 mb-6 shadow-xl">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>World's 1st Evidence-First Food Safety & Shopping Intelligence</span>
          </motion.div>

          {/* Main Bold Headline */}
          <motion.h1 variants={itemVars} className="max-w-5xl text-5xl font-black tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl leading-[1.08]">
            Unmask Every Label. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Expose Chemical Traps.
            </span> <br />
            Shop With Zero Fear.
          </motion.h1>

          {/* Value Proposition Description */}
          <motion.p variants={itemVars} className="mt-6 max-w-2xl text-base md:text-lg text-zinc-300 leading-relaxed font-normal">
            Scan packaging labels instantly or let our autonomous <strong>Guardian AI Agent</strong> cross-examine front-of-pack claims, uncover dangerous additive cocktails, and find verified clean swaps you can buy in 1-click.
          </motion.p>

          {/* Trust Metric Badges */}
          <motion.div variants={itemVars} className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-zinc-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> 255/255 Verified Benchmarks
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Zero Hallucinations Guaranteed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1">
              <Microscope className="w-3.5 h-3.5 text-emerald-400" /> Additive Cocktail Detection
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> 1-Click Smart Swaps
            </span>
          </motion.div>

          {/* Primary Call to Action Buttons */}
          <motion.div variants={itemVars} className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/guardian/agent"
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black px-8 py-4 font-black text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(16,185,129,0.35)]"
            >
              <Sparkles className="w-5 h-5 text-black" /> 
              <span>Launch Guardian Agent</span>
              <ArrowRight className="w-5 h-5 text-black transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href={isLoggedIn ? '/scan' : '/auth'}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-white text-black px-7 py-4 font-bold text-lg hover:bg-zinc-200 transition-all duration-300 shadow-lg"
            >
              <Camera className="w-5 h-5 text-black transition-transform group-hover:rotate-12" /> 
              <span>Scan Food Label</span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero Interactive AR Demo */}
        <motion.div 
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, type: "spring" }}
          className="mt-16 w-full max-w-5xl z-20 px-4"
        >
          <ArDemo />
        </motion.div>
      </section>

      {/* ================= 4 UNBEATABLE MARKET-LEADING CAPABILITIES ================= */}
      <section className="py-24 border-t border-white/10 bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 mb-4 uppercase tracking-widest">
              Unrivaled Competitive Advantage
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
              Why Nobody Can Compete With ScanSafe
            </h2>
            <p className="text-zinc-400 text-base md:text-lg">
              Generic nutrition apps count calories. ScanSafe acts as your clinical food guardian, exposing additive synergies, marketing deception, and finding verified clean replacements.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature Card 1: Combinatorial Chemical Synergies */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-zinc-900/60 to-black p-8 relative overflow-hidden group hover:border-rose-500/50 transition-all shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Microscope className="w-6 h-6" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Pioneering Science</span>
                  <h3 className="text-xl font-black text-white">Combinatorial Chemical Synergies</h3>
                </div>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                Detects dangerous additive "cocktail effects" when two individually approved additives combine in a single product:
              </p>
              <ul className="space-y-2 text-xs text-zinc-400 mb-6 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <strong>Benzene Carcinogen Formation:</strong> Sodium Benzoate (E211) + Vitamin C (E300).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <strong>Southampton ADHD Cocktail:</strong> Tartrazine (E102) + Sodium Benzoate.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <strong>Gut Barrier Degradation:</strong> Polysorbate 80 (E433) + Carboxymethylcellulose (CMC).
                </li>
              </ul>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                <span>Backed by Lancet, Nature, and FDA monographs</span>
              </div>
            </motion.div>

            {/* Feature Card 2: Greenwashing & Deceptive Marketing Exposer */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-zinc-900/60 to-black p-8 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="w-6 h-6" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Label Forensic Audit</span>
                  <h3 className="text-xl font-black text-white">Greenwashing & Deception Exposer</h3>
                </div>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                Cross-examines flashy front-of-pack claims against factual back-of-pack ingredient realities:
              </p>
              <ul className="space-y-2 text-xs text-zinc-400 mb-6 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <strong>Zero Sugar Illusion:</strong> Exposes hidden high-glycemic Maltodextrin (GI &gt; 110).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <strong>Premium Oil Dilution:</strong> Catches "Real Olive Oil" containing 97% Refined Palm Olein.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <strong>Whole Wheat Ruse:</strong> Flags products where #1 ingredient is Refined Maida.
                </li>
              </ul>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                <span>Never fooled by front-of-pack marketing claims</span>
              </div>
            </motion.div>

            {/* Feature Card 3: Smart Swap Engine ("Buy This Instead") */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-900/60 to-black p-8 relative overflow-hidden group hover:border-emerald-500/50 transition-all shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShoppingBag className="w-6 h-6" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Actionable Health</span>
                  <h3 className="text-xl font-black text-white">Smart Swap — "Buy This Instead"</h3>
                </div>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                Don't just get warned—get better choices. Whenever a scanned product fails clinical tests, ScanSafe serves clean alternatives:
              </p>
              <ul className="space-y-2 text-xs text-zinc-400 mb-6 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <strong>Verified Clean Badges:</strong> Zero Palm Oil, No Maida, Stoneground Whole Grains.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <strong>Clinical Rationale:</strong> Clear breakdown of why the alternative is superior.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <strong>1-Click Quick Purchase:</strong> Direct delivery links for Blinkit, Zepto, BigBasket, Amazon.
                </li>
              </ul>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <span>Turns health warnings into seamless clean shopping</span>
              </div>
            </motion.div>

            {/* Feature Card 4: Hyper-Personalized Clinical Health Profiles */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-zinc-900/60 to-black p-8 relative overflow-hidden group hover:border-indigo-500/50 transition-all shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <HeartPulse className="w-6 h-6" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Clinical Personalization</span>
                  <h3 className="text-xl font-black text-white">Hyper-Personalized Health Profiles</h3>
                </div>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                Beyond basic allergens, ScanSafe protects specialized, vulnerable metabolic and endocrine states:
              </p>
              <ul className="space-y-2 text-xs text-zinc-400 mb-6 font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <strong>PCOD / PCOS Care:</strong> Flags insulin-spiking liquid sugars and inflammatory seed oils.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <strong>Kids & Toddler Clean Screen:</strong> Zero tolerance for synthetic dyes & intense sweeteners.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <strong>Renal / Kidney-Conscious:</strong> Filters absorbable inorganic phosphates & potassium salts.
                </li>
              </ul>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                <span>Personalized clinical protection for every family member</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= GUARDIAN AI AUTONOMOUS AGENT SHOWCASE ================= */}
      <section className="py-24 border-t border-white/10 bg-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-black p-8 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider">
                  Autonomous Agent Workflow
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
                  Meet ScanSafe Guardian AI
                </h2>
                <p className="text-zinc-300 text-base leading-relaxed">
                  Give Guardian a complex natural-language shopping goal with strict dietary restrictions and a budget. The autonomous state machine retrieves candidate evidence, cross-examines dietary rules deterministically, and builds an evidence-backed shopping shortlist.
                </p>
              </div>

              <Link
                href="/guardian/agent"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-4 font-black text-lg transition-transform hover:scale-105 shadow-xl shrink-0"
              >
                <Sparkles className="w-5 h-5 text-black" />
                <span>Launch Agent Workspace</span>
                <ChevronRight className="w-5 h-5 text-black" />
              </Link>
            </div>

            {/* State Machine Flow Visualization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Stage 01</span>
                <h4 className="font-bold text-white text-sm mt-1">Goal Decomposition</h4>
                <p className="text-xs text-zinc-400 mt-2">
                  Extracts target categories, positive keywords, excluded tokens, and currency constraints without dropping rules.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Stage 02</span>
                <h4 className="font-bold text-white text-sm mt-1">Multi-Source Discovery</h4>
                <p className="text-xs text-zinc-400 mt-2">
                  Searches curated databases and public feeds with dynamic replanning and rate-limited concurrency leases.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Stage 03</span>
                <h4 className="font-bold text-white text-sm mt-1">Deterministic Safety</h4>
                <p className="text-xs text-zinc-400 mt-2">
                  Safety is strictly verified by deterministic code rules across 15 allergen families—NEVER left to probabilistic LLMs.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Stage 04</span>
                <h4 className="font-bold text-white text-sm mt-1">Verified Shortlist</h4>
                <p className="text-xs text-zinc-400 mt-2">
                  Generates an evidence-backed shortlist with traceable GTINs, source URLs, and affirmative human approval gates.
                </p>
              </div>
            </div>

            {/* Quick Demo Goal Buttons */}
            <div className="border-t border-zinc-800/80 pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                Try Pre-Configured Autonomous Goals in the Agent:
              </p>
              <div className="flex flex-wrap gap-2.5">
                {[
                  "Find peanut-free breakfast options under 250 INR",
                  "Compare dairy-free protein bars with clean declarations",
                  "Identify gluten-free snacks with zero cross-contact warnings",
                  "Find nut-free and seed-friendly spreads under 30 AED"
                ].map((preset, idx) => (
                  <Link
                    key={idx}
                    href={`/guardian/agent?preset=${encodeURIComponent(preset)}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white transition"
                  >
                    <Search className="w-3.5 h-3.5 text-emerald-400" />
                    <span>"{preset}"</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRANSPARENCY & METHODOLOGY ================= */}
      <section className="py-20 border-y border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Transparent Food Label Intelligence</h2>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto mb-8">
              Scan packaged-food labels to understand listed ingredients, nutrition facts, and dietary compatibility based on published guidelines.
            </p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-2">
              <div className="flex flex-col items-center">
                <span className="text-4xl md:text-5xl font-black text-emerald-400">Optical OCR</span>
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-2">Printed Label Extraction</span>
              </div>
              <div className="hidden md:block w-px h-16 bg-zinc-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-4xl md:text-5xl font-black text-indigo-400">Nutritional Facts</span>
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-2">100g / Serving Standards</span>
              </div>
              <div className="hidden md:block w-px h-16 bg-zinc-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-4xl md:text-5xl font-black text-amber-400">Unknown When Missing</span>
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest mt-2">Zero Fabricated Values</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars} className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Capture Packaging</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Photograph the printed ingredient list and nutrition table clearly. AI reads visible printed text directly from food packaging.
              </p>
              <p className="text-xs text-zinc-500 border-t border-zinc-850 pt-3">
                AI can misread blurry or curved labels. Always inspect the extracted text.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars} className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Evidence-Based Extraction</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Extracts listed additives, allergens, and macronutrients. Missing panels are strictly marked as unknown rather than assumed.
              </p>
              <p className="text-xs text-zinc-500 border-t border-zinc-850 pt-3">
                No pseudo-scientific metrics or unverified laboratory certifications.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars} className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl relative">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Nutritional Estimates</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Scores represent nutritional estimates based on declared facts. They do not certify chemical purity, product safety, or regulatory compliance.
              </p>
              <p className="text-xs text-zinc-500 border-t border-zinc-850 pt-3">
                Scores are informational guidelines, not medical advice.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= CINEMATIC CTA ================= */}
      <section className="py-32 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-zinc-900/50 -z-10"></div>
        <motion.div 
          initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
          className="max-w-7xl mx-auto px-4 text-center"
        >
          <h2 className="text-[10vw] md:text-[7vw] font-black tracking-tighter leading-none text-white opacity-95 mb-8">
            Eat Safer. <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Shop Smarter.
            </span>
          </h2>
          <p className="text-zinc-400 text-base md:text-xl max-w-xl mx-auto mb-10">
            Join thousands of smart consumers who use ScanSafe to protect their families from toxic additives and misleading marketing.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-5 items-center relative z-20">
            <Link
              href="/guardian/agent"
              className="w-full sm:w-auto rounded-full bg-emerald-500 text-black px-10 py-5 font-black text-xl hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
            >
              Launch Guardian AI Agent
            </Link>
            <Link
              href={isLoggedIn ? '/scan' : '/auth'}
              className="w-full sm:w-auto rounded-full border border-white/20 bg-zinc-950 text-white px-10 py-5 font-bold text-xl hover:bg-white/10 transition-colors duration-300"
            >
              Scan Food Label
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-12 border-t border-white/5 text-center text-zinc-500 text-sm font-medium bg-black">
        <div className="flex justify-center gap-6 mb-6 flex-wrap px-4">
          <Link href="/guardian/agent" className="hover:text-emerald-400 transition-colors">Guardian Agent</Link>
          <Link href="/scan" className="hover:text-emerald-400 transition-colors">Scanner</Link>
          <Link href="/compare" className="hover:text-emerald-400 transition-colors">Product Compare</Link>
          <Link href="/saved" className="hover:text-emerald-400 transition-colors">Saved List</Link>
          <Link href="/pricing" className="hover:text-emerald-400 transition-colors">Pricing</Link>
          <Link href="/pitch" className="hover:text-emerald-400 transition-colors">Pitch Deck</Link>
          <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} ScanSafe. All rights reserved. Built with clinical evidence standards.</p>
      </footer>
    </div>
  )
}
