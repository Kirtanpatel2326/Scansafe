'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function TranslationObserver() {
  const pathname = usePathname()

  useEffect(() => {
    const getCookie = (name: string): string => {
      if (typeof window === 'undefined') return 'en'
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '')
      return 'en'
    }

    const targetLang = getCookie('preferred_lang') || 'en'
    if (targetLang === 'en') return

    // Wait for the Next.js page transition to complete and components to mount
    const timeout = setTimeout(() => {
      const googleCombo = document.querySelector('.goog-te-combo') as HTMLSelectElement
      if (googleCombo) {
        if (googleCombo.value === targetLang) {
          // If already set to the target language, toggle to English and back 
          // to force Google Translate to re-scan and translate the new page DOM nodes.
          googleCombo.value = 'en'
          googleCombo.dispatchEvent(new Event('change'))
          
          setTimeout(() => {
            const reFoundCombo = document.querySelector('.goog-te-combo') as HTMLSelectElement
            if (reFoundCombo) {
              reFoundCombo.value = targetLang
              reFoundCombo.dispatchEvent(new Event('change'))
            }
          }, 150)
        } else {
          googleCombo.value = targetLang
          googleCombo.dispatchEvent(new Event('change'))
        }
      }
    }, 600)

    return () => clearTimeout(timeout)
  }, [pathname])

  return null
}
