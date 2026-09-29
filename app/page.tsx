'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ArDemo from '@/components/ArDemo'
import { Sparkles, Camera, ShieldCheck, Star, ChevronRight, Zap, Check, FileText, Activity, AlertTriangle, Fingerprint, Search } from 'lucide-react'
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
      
      // Track page view only if not an admin to keep analytics accurate
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
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  }

  const itemVars: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
  }

  const fadeUpVars: Variants = {
    hidden: { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black overflow-hidden font-sans">
      <Header />

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-24 pb-20 md:pt-36 md:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        {/* Dynamic Aurora Background */}
        <motion.div style={{ y: yBg }} className="absolute inset-0 -z-10 flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }} 
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 h-[500px] w-[500px] rounded-full bg-emerald-600/20 blur-[150px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-[150px]" 
          />
        </motion.div>

        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10"
        >
          <motion.div variants={itemVars} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-zinc-300 mb-8 shadow-xl">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> {t.heroBadge}
          </motion.div>

          <motion.h1 variants={itemVars} className="max-w-5xl text-6xl font-black tracking-tighter text-white sm:text-7xl md:text-8xl leading-[1.1]">
            {t.heroTitle1} <br />
            <span className="bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">{t.heroTitle2}</span> <br/>
            {t.heroTitle3}
          </motion.h1>

          <motion.p variants={itemVars} className="mt-8 max-w-2xl text-lg text-zinc-400 leading-relaxed font-medium">
            {t.heroDesc}
          </motion.p>

          <motion.div variants={itemVars} className="mt-12 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href={isLoggedIn ? '/scan' : '/auth'}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-white text-black px-8 py-4 font-bold text-lg hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              <Camera className="w-5 h-5 transition-transform group-hover:rotate-12" /> {t.heroBtnStart}
            </a>
            <a
              href="/demo"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 px-8 py-4 font-bold text-lg transition-all duration-300 backdrop-blur-md"
            >
              <Sparkles className="w-5 h-5 text-emerald-400" /> Try Guest Demo
            </a>
            <a
              href="/pitch"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-white px-8 py-4 font-semibold text-lg transition-all duration-300 backdrop-blur-md"
            >
              <FileText className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" /> {t.heroBtnPitch}
            </a>
          </motion.div>
        </motion.div>

        {/* Hero Interactive AR Demo */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.6, type: "spring" }}
          className="mt-16 w-full max-w-5xl z-20"
        >
          <ArDemo />
        </motion.div>
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

      {/* ================= BENTO BOX FEATURES ================= */}
      <section className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
            className="mb-16 md:mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6">
              {t.bentoTitle1}<br/><span className="text-zinc-500">{t.bentoTitle2}</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl">
              {t.bentoDesc}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto md:auto-rows-[300px]">
            {/* Big Bento Card */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="md:col-span-2 rounded-3xl border border-white/10 bg-zinc-900/40 p-8 overflow-hidden relative group hover:bg-zinc-900/60 transition-colors"
            >
              <div className="absolute -right-20 -top-20 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <Camera className="w-96 h-96" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6 border border-emerald-500/30">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{t.bentoCard1Title}</h3>
                <p className="text-zinc-400 leading-relaxed max-w-md">
                  {t.bentoCard1Desc}
                </p>
              </div>
            </motion.div>

            {/* Small Bento Card 1 */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 overflow-hidden relative group hover:bg-zinc-900/60 transition-colors"
            >
              <div className="absolute right-0 bottom-0 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <ShieldCheck className="w-64 h-64" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t.bentoCard2Title}</h3>
                <p className="text-zinc-400 text-sm">
                  {t.bentoCard2Desc}
                </p>
              </div>
            </motion.div>

            {/* Small Bento Card 2 */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 overflow-hidden relative group hover:bg-zinc-900/60 transition-colors"
            >
               <div className="absolute right-0 top-0 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <Fingerprint className="w-64 h-64" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-end">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t.bentoCard3Title}</h3>
                <p className="text-zinc-400 text-sm">
                  {t.bentoCard3Desc}
                </p>
              </div>
            </motion.div>

            {/* Wide Bento Card */}
            <motion.div 
              initial="hidden" whileInView="whileInView" viewport={{ once: true }} variants={fadeUpVars}
              className="md:col-span-2 rounded-3xl border border-white/10 bg-zinc-900/40 p-8 overflow-hidden relative group hover:bg-zinc-900/60 transition-colors"
            >
               <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <Zap className="w-48 h-48 text-rose-500" />
              </div>
              <div className="relative z-10 h-full flex flex-col justify-center">
                <h3 className="text-2xl font-black text-white mb-3">{t.bentoCard4Title} <span className="ml-3 inline-block rounded-full bg-rose-500/20 border border-rose-500/50 px-3 py-1 text-xs text-rose-400 uppercase tracking-widest font-bold">{t.bentoCard4Badge}</span></h3>
                <p className="text-zinc-400 leading-relaxed max-w-md">
                  {t.bentoCard4Desc}
                </p>
              </div>
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
          <h2 className="text-[12vw] md:text-[8vw] font-black tracking-tighter leading-none text-white opacity-90 mb-12">
            {t.ctaTitle1} <br/><span className="text-zinc-800">{t.ctaTitle2}</span>
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6 items-center relative z-20">
            <a
              href={isLoggedIn ? '/scan' : '/auth'}
              className="w-full sm:w-auto rounded-full bg-white text-black px-10 py-5 font-black text-xl hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              {t.ctaBtnGetStarted}
            </a>
            <a
              href="/pricing"
              className="w-full sm:w-auto rounded-full border border-white/20 bg-black text-white px-10 py-5 font-bold text-xl hover:bg-white/5 transition-colors duration-300"
            >
              {t.ctaBtnPricing}
            </a>
          </div>
        </motion.div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="py-8 border-t border-white/5 text-center text-zinc-600 text-sm font-medium">
        <div className="flex justify-center gap-6 mb-4">
          <a href="/terms" className="hover:text-emerald-400 transition-colors">{t.footerTerms}</a>
          <a href="/privacy" className="hover:text-emerald-400 transition-colors">{t.footerPrivacy}</a>
          <a href="/refund" className="hover:text-emerald-400 transition-colors">{t.footerRefunds}</a>
          <a href="/contact" className="hover:text-emerald-400 transition-colors">{t.footerContact}</a>
          <a href="/pitch" className="hover:text-emerald-400 transition-colors">{t.footerPitch}</a>
        </div>
        <p>&copy; {new Date().getFullYear()} ScanSafe. {t.footerCopy}</p>
      </footer>
    </div>
  )
}
