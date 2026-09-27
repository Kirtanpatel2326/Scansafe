'use client'

import React, { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export default function ScrollNavigator() {
  const [showScrollUp, setShowScrollUp] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      
      // Show Scroll Up if scrolled down more than 300px
      setShowScrollUp(scrollY > 300)
      
      // Show Scroll Down if there's remaining content to scroll and not near the bottom
      setShowScrollDown(scrollHeight - scrollY - clientHeight > 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // Initial check
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    })
  }

  const isVisible = showScrollUp || showScrollDown

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        >
          {showScrollUp && (
            <button
              onClick={scrollToTop}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 backdrop-blur-md transition hover:border-emerald-500/50 hover:bg-zinc-800 hover:text-emerald-400 active:scale-95 shadow-lg shadow-black/40 cursor-pointer"
              title="Scroll to Top"
              aria-label="Scroll to Top"
            >
              <ChevronUp className="h-6 w-6 stroke-[2.5]" />
            </button>
          )}

          {showScrollDown && (
            <button
              onClick={scrollToBottom}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 backdrop-blur-md transition hover:border-emerald-500/50 hover:bg-zinc-800 hover:text-emerald-400 active:scale-95 shadow-lg shadow-black/40 cursor-pointer"
              title="Scroll to Bottom"
              aria-label="Scroll to Bottom"
            >
              <ChevronDown className="h-6 w-6 stroke-[2.5]" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
