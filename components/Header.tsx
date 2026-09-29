'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon, ShieldAlert, Sparkles, History, Camera, CreditCard, ChevronDown, FileText, Zap, Crown, GitCompare, Menu, X } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from '@/lib/translations'

export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [scanCredits, setScanCredits] = useState<number>(0)
  const [scanPlan, setScanPlan] = useState<string>('free')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
    // Get current user session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchUserProfile(user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        fetchUserProfile(currentUser.id)
      } else {
        setScanCredits(0)
        setScanPlan('free')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, scans_today')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setScanPlan(data.plan || 'free')
        setScanCredits(data.scans_today || 0)
      }
    } catch (e) {
      console.error('Error fetching profile plan:', e)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsDropdownOpen(false)
    window.location.href = '/'
  }

  const isActive = (path: string) => pathname === path

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2.5 group">
            <img 
              src="/logo_icon.jpg" 
              alt="ScanSafe Logo" 
              className="w-7 h-7 rounded-md object-cover border border-emerald-500/20 group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-xl font-black tracking-tight text-white transition duration-300">
              SCAN<span className="text-emerald-400">SAFE</span>
            </span>
          </a>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-400">
            <a
              href="/scan"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/scan') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <Camera className="w-4 h-4" />
              {t.navScanner}
            </a>
            <a
              href="/compare"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/compare') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <GitCompare className="w-4 h-4" />
              {t.navCompare}
            </a>
            <a
              href="/history"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/history') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <History className="w-4 h-4" />
              {t.navHistory}
            </a>
            <a
              href="/pricing"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/pricing') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {t.navPricing}
            </a>
            <a
              href="/demo"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/demo') ? 'text-amber-400 bg-amber-950/20 font-bold' : 'text-zinc-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Demo
            </a>
            <a
              href="/pitch"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/pitch') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <FileText className="w-4 h-4" />
              {t.navPitch}
            </a>
          </nav>
        </div>

        {/* User Actions & Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Custom Language Switcher - hidden on mobile header, shown on desktop */}
          <div className="hidden md:flex items-center">
            <LanguageSwitcher />
          </div>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-850 transition duration-200"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-black">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate text-zinc-200">
                  {user.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
               </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="px-3 py-2 border-b border-zinc-800 mb-1.5">
                    <p className="text-xs text-zinc-550 truncate">Signed in as</p>
                    <p className="text-xs font-semibold text-zinc-200 truncate">{user.email}</p>
                    
                    {/* Scan Credits Badge */}
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {scanPlan === 'pro' ? (
                        <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm font-black">
                          <Crown className="w-3 h-3 fill-black text-black" /> PRO PLAN
                        </span>
                      ) : (
                        <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm font-black">
                          <Zap className="w-3 h-3 fill-black" /> {Math.max(0, 5 - scanCredits)} SCANS LEFT
                        </span>
                      )}
                    </div>
                  </div>

                  {user.email?.toLowerCase() === 'kirtanpatel2326@gmail.com' && (
                    <div className="border-b border-zinc-800 pb-1.5 mb-1.5 px-1.5 flex flex-col gap-1">
                      <a
                        href="/scan"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        Use App (Scanner)
                      </a>
                      <a
                        href="/admin"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        Admin Dashboard
                      </a>
                    </div>
                  )}

                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition duration-150"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.navLogout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/auth"
              className="inline-flex items-center whitespace-nowrap gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition duration-200 shadow-md shadow-emerald-950/20"
            >
              {t.navLogin}
            </a>
          )}

          {/* Hamburger Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-zinc-850 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown List */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-900 bg-zinc-950/95 backdrop-blur-lg px-4 py-4 flex flex-col gap-1.5 z-40">
          {/* Language Switcher inside mobile dropdown drawer to prevent header squeezing */}
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-2 px-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Language</span>
            <LanguageSwitcher />
          </div>

          <a
            href="/scan"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition text-sm font-bold ${
              isActive('/scan') ? 'text-emerald-400 bg-emerald-950/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Camera className="w-4 h-4" />
            {t.navScanner}
          </a>
          <a
            href="/compare"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition text-sm font-bold ${
              isActive('/compare') ? 'text-emerald-400 bg-emerald-950/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            {t.navCompare}
          </a>
          <a
            href="/history"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition text-sm font-bold ${
              isActive('/history') ? 'text-emerald-400 bg-emerald-950/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <History className="w-4 h-4" />
            {t.navHistory}
          </a>
          <a
            href="/pricing"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition text-sm font-bold ${
              isActive('/pricing') ? 'text-emerald-400 bg-emerald-950/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            {t.navPricing}
          </a>
          <a
            href="/demo"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition text-sm font-bold ${
              isActive('/demo') ? 'text-amber-400 bg-amber-950/20' : 'text-amber-300 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Guest Demo (Zero Credits)
          </a>
          <a
            href="/pitch"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition text-sm font-bold ${
              isActive('/pitch') ? 'text-emerald-400 bg-emerald-950/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
            }`}
          >
            <FileText className="w-4 h-4" />
            {t.navPitch}
          </a>
        </div>
      )}
    </header>
  )
}
