'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, signInWithGoogle } from '@/lib/supabase'
import { Sparkles, Mail, Lock, User, ArrowRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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
          },
        })

        if (error) throw error

        if (data.user) {
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      {/* Decorative Blur Elements */}
      <div className="absolute top-1/4 left-1/3 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/3 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white">
            SCAN<span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">SAFE</span>
          </h1>
          <p className="text-zinc-400 text-xs mt-1.5 font-medium tracking-wide">
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
            <div className="w-full border-t border-zinc-850"></div>
          </div>
          <span className="relative bg-zinc-900/10 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Or Alternate Sign In
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={signInWithGoogle}
          className="w-full border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/90 text-zinc-350 hover:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-colors cursor-pointer"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4.5 h-4.5" />
          Continue with Google
        </button>

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
      </div>
    </div>
  )
}
