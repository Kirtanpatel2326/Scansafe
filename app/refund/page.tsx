'use client'

import React from 'react'
import Header from '@/components/Header'
import { RotateCcw, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black font-sans flex flex-col justify-between">
      <div>
        <Header />
        
        <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Cancellation & <span className="text-emerald-400">Refund Policy</span>
            </h1>
            <p className="mt-4 text-zinc-400">Last updated: June 2026</p>
          </div>

          <div className="space-y-12 text-zinc-300 leading-relaxed">
            
            <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400" /> Scan Packs & Credit Validity
              </h2>
              <div className="space-y-4">
                <p>
                  ScanSafe offers pay-as-you-go Scan Packs (₹10 for 10 scans, ₹99 for 100 scans, ₹299 for 320 scans, and ₹999 for 1200 scans).
                </p>
                <p>
                  All purchased scan credits come with <strong>lifetime validity</strong> and do not expire. You maintain full ownership of your credits until they are consumed for scans, comparisons, or meal compositions.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <RotateCcw className="w-6 h-6 text-emerald-400" /> Refund Eligibility for Scan Packs
              </h2>
              <div className="space-y-4">
                <p>
                  We offer a transparent <strong>7-Day Unused Pack Refund Guarantee</strong>. If you purchase a scan pack and have not used any scan credits from that pack, you may request a 100% full refund within 7 days of purchase.
                </p>
                <p>
                  To request a refund, simply email <span className="text-emerald-400 font-semibold">kirtanpatel2305@gmail.com</span> with your transaction reference.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-400">
                  <li>Full refunds apply to packs where zero credits have been consumed.</li>
                  <li>If an AI scan encounters a server-side error, that credit is automatically restored to your account ledger immediately.</li>
                  <li>Approved refunds are processed back to the original payment channel (UPI / Card) within 5-7 business days via Razorpay.</li>
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400" /> Erroneous Charges
              </h2>
              <div className="space-y-4">
                <p>
                  If you believe you have been charged in error (e.g., duplicate billing), please contact us immediately. We will review the transaction and, if verified as an error, issue a full refund for the duplicate charge.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center gap-3">
                <HelpCircle className="w-6 h-6" /> Need Help?
              </h2>
              <p className="mb-4">
                To request a cancellation or report a billing issue, please email our support team directly. We strive to respond to all inquiries within 24 hours.
              </p>
              <p>
                Email: <span className="text-emerald-400 font-bold">kirtanpatel2305@gmail.com</span><br />
                Subject: <span className="text-zinc-400">Billing Inquiry - [Your Email]</span>
              </p>
            </section>

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
