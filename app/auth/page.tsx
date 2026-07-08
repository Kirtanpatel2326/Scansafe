'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, signInWithGoogle } from '@/lib/supabase'
import { Sparkles, Mail, Lock, User, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push('/scan')
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email || !password) {
      setErrorMsg('Please fill in all required fields.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data.user) {
          if (!data.session) {
            setSuccessMsg('Account created successfully! Please check your email to verify your account.')
            return
          }

          // Verify/ensure profile in DB
          await fetch('/api/profile/ensure', { method: 'POST' })
          
          setSuccessMsg('Account created successfully! Redirecting you now...')
          setTimeout(() => {
            router.push('/scan')
          }, 1500)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          // Verify/ensure profile in DB
          await fetch('/api/profile/ensure', { method: 'POST' })
          
          router.push('/scan')
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err)
      setErrorMsg(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black overflow-hidden">
      {/* Decorative Blur Elements */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/3 -z-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-[120px]" 
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.4, 0.3] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 backdrop-blur-xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-lg">
            SCAN<span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">SAFE</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-2 font-bold tracking-wide">
            Your Premium AI Food Ingredients Guardian
          </p>
        </div>

        {/* Custom Notifications */}
        {errorMsg && (
          <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 flex gap-2.5 items-start">
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-rose-400 text-xs font-semibold leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex gap-2.5 items-start">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-emerald-400 text-xs font-semibold leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 pl-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 focus:border-emerald-500/80 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold outline-none transition"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 pl-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 focus:border-emerald-500/80 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold outline-none transition"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 pl-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-850 hover:border-zinc-800 focus:border-emerald-500/80 rounded-xl py-3 pl-11 pr-4 text-sm font-semibold outline-none transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black py-3.5 font-bold transition duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === 'signup' ? 'Create Account' : 'Sign In'}{' '}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <span className="relative bg-[#111113] px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest rounded-full">
            Or Alternate Sign In
          </span>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={signInWithGoogle}
            className="w-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/60 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
          >
            <div className="bg-white p-1 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            </div>
            Continue with Google
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              // signInWithApple is a placeholder unless implemented in supabase.ts
              if (typeof (window as any).signInWithApple === 'function') {
                (window as any).signInWithApple()
              } else {
                alert("Apple Sign-In is not fully configured yet.")
              }
            }}
            className="w-full border border-zinc-700 bg-black hover:bg-zinc-900 text-white hover:text-white hover:border-zinc-500 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-5 h-5 fill-white">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
            </div>
            Continue with Apple
          </motion.button>
        </div>

        {/* Mode Switch Link */}
        <div className="text-center mt-6 text-xs font-semibold">
          {mode === 'signup' ? (
            <span className="text-zinc-500">
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-emerald-400 hover:underline outline-none"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span className="text-zinc-500">
              Don't have an account yet?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-emerald-400 hover:underline outline-none"
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  )
}
