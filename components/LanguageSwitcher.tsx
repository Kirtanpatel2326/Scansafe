'use client'

import React, { useEffect, useState } from 'react'
import { Globe, RefreshCw } from 'lucide-react'
import { saveUserLanguage } from '@/lib/language'
import { supabase } from '@/lib/supabase'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'mr', label: 'मराठी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' }
]

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
  
  if (name === 'preferred_lang') {
    if (value === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    } else {
      const transVal = `/en/${value}`
      document.cookie = `googtrans=${transVal}; expires=${expires}; path=/`
    }
  }
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '')
  return null
}

export default function LanguageSwitcher() {
  const [selectedLang, setSelectedLang] = useState('en')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // 1. Initial load from cookies
    const current = getCookie('preferred_lang') || 'en'
    setSelectedLang(current)

    // 2. Automatically sync with hidden Google Translate element
    const interval = setInterval(() => {
      const googleCombo = document.querySelector('.goog-te-combo') as HTMLSelectElement
      if (googleCombo && googleCombo.options && googleCombo.options.length > 1) {
        const optionExists = Array.from(googleCombo.options).some(opt => opt.value === current)
        if (optionExists || current === 'en') {
          clearInterval(interval)
          if (googleCombo.value !== current) {
            googleCombo.value = current
            googleCombo.dispatchEvent(new Event('change'))
          }
        }
      }
    }, 250)

    // Stop searching after 15 seconds
    setTimeout(() => clearInterval(interval), 15000)

    // 3. Check and sync with database if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('preferred_language, dietary_profile')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const dbLang = data.preferred_language || (data.dietary_profile as any)?.preferred_language
              if (dbLang && dbLang !== current) {
                setSelectedLang(dbLang)
                setCookie('preferred_lang', dbLang, 365)
              }
            }
          })
      }
    })
  }, [])

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value
    setSelectedLang(newLang)
    setCookie('preferred_lang', newLang, 365)

    setUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await saveUserLanguage(user.id, newLang)
      }
    } catch (err) {
      console.error('Failed to sync language preference to database:', err)
    } finally {
      setUpdating(false)
      // Force reload to update UI components and trigger translation
      window.location.reload()
    }
  }

  return (
    <div className="relative flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-zinc-300">
      {updating ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
      ) : (
        <Globe className="w-3.5 h-3.5 text-emerald-400" />
      )}
      <select
        value={selectedLang}
        onChange={handleLanguageChange}
        className="bg-transparent text-xs font-bold text-zinc-200 outline-none cursor-pointer pr-1"
        style={{ WebkitAppearance: 'none', appearance: 'none' }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-zinc-950 text-white font-sans text-xs">
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}
