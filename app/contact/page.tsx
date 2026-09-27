'use client'

import React from 'react'
import Header from '@/components/Header'
import { Mail, MapPin, Phone, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black font-sans flex flex-col justify-between">
      <div>
        <Header />
        
        <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Contact <span className="text-emerald-400">Us</span>
            </h1>
            <p className="mt-4 text-zinc-400 max-w-2xl mx-auto">
              Have questions about ScanSafe, need help with your account, or want to report an issue? We're here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Email Support */}
            <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Email Support</h3>
              <p className="text-zinc-400 mb-6 flex-1">
                For general inquiries, technical support, and billing questions. We typically respond within 24 hours.
              </p>
              <div className="flex flex-col gap-2">
                <a href="mailto:kirtanpatel2305@gmail.com" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
                  kirtanpatel2305@gmail.com
                </a>
                <span className="text-zinc-500 text-[10px]">
                  Alternative: support@scansafe.in (inactive)
                </span>
              </div>
            </div>

            {/* Business Address */}
            <div className="rounded-3xl border border-white/5 bg-zinc-900/50 p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Registered Address</h3>
              <p className="text-zinc-400 mb-6 flex-1">
                ScanSafe AI Pvt. Ltd.<br />
                <span className="text-xs text-zinc-500">Founder: Kirtan Patel</span><br />
                Anand, Gujarat<br />
                India, 388001
              </p>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Mail Only</span>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="mt-12 py-8 border-t border-white/5 text-center text-sm text-zinc-500 bg-black">
        <div className="flex justify-center gap-6 mb-4">
          <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link>
          <Link href="/refund" className="hover:text-emerald-400 transition-colors">Refunds</Link>
          <Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link>
        </div>
        <p>© 2026 ScanSafe. All rights reserved.</p>
      </footer>
    </div>
  )
}
