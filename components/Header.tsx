'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon, ShieldAlert, Sparkles, History, Camera, CreditCard, ChevronDown, FileText } from 'lucide-react'

export default function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [plan, setPlan] = useState<string>('free')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

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
        setPlan('free')
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
        .select('plan')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setPlan(data.plan || 'free')
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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-black tracking-tight text-white transition duration-300 group-hover:scale-105">
              SCAN<span className="text-emerald-400">SAFE</span>
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-zinc-400">
            <Link
              href="/scan"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/scan') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <Camera className="w-4 h-4" />
              Scanner
            </Link>
            <Link
              href="/history"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/history') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <History className="w-4 h-4" />
              History
            </Link>
            <Link
              href="/pricing"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/pricing') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Pricing
            </Link>
            <Link
              href="/pitch"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:text-white ${
                isActive('/pitch') ? 'text-emerald-400 bg-emerald-950/10' : ''
              }`}
            >
              <FileText className="w-4 h-4" />
              Pitch Deck
            </Link>
          </nav>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          {/* Navigation Links - Mobile */}
          <nav className="flex md:hidden items-center gap-1 text-xs font-medium text-zinc-400 mr-2">
            <Link
              href="/scan"
              className={`p-2 rounded-lg ${isActive('/scan') ? 'text-emerald-400' : ''}`}
            >
              <Camera className="w-4 h-4" />
            </Link>
            <Link
              href="/history"
              className={`p-2 rounded-lg ${isActive('/history') ? 'text-emerald-400' : ''}`}
            >
              <History className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className={`p-2 rounded-lg ${isActive('/pricing') ? 'text-emerald-400' : ''}`}
            >
              <CreditCard className="w-4 h-4" />
            </Link>
            <Link
              href="/pitch"
              className={`p-2 rounded-lg ${isActive('/pitch') ? 'text-emerald-400' : ''}`}
              title="Pitch Deck"
            >
              <FileText className="w-4 h-4" />
            </Link>
          </nav>

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
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-3 py-2 border-b border-zinc-800 mb-1.5">
                    <p className="text-xs text-zinc-500 truncate">Signed in as</p>
                    <p className="text-xs font-semibold text-zinc-200 truncate">{user.email}</p>
                    
                    {/* Plan Badge */}
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {plan === 'pro' ? (
                        <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                          <Sparkles className="w-3 h-3 fill-black" /> PRO
                        </span>
                      ) : (
                        <span className="bg-zinc-850 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                          FREE
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition duration-150"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition duration-200 shadow-md shadow-emerald-950/20"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
