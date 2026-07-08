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
                <CheckCircle className="w-6 h-6 text-emerald-400" /> Subscription Cancellations
              </h2>
              <div className="space-y-4">
                <p>
                  You may cancel your ScanSafe subscription at any time through your account settings or by contacting our support team. 
                </p>
                <p>
                  If you cancel your subscription, you will retain access to the Pro features until the end of your current billing cycle. After that date, your account will revert to the Free tier. We do not charge cancellation fees.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <RotateCcw className="w-6 h-6 text-emerald-400" /> Refund Eligibility (Digital Service)
              </h2>
              <div className="space-y-4">
                <p>
                  Because ScanSafe is a digital SaaS (Software as a Service) platform providing immediate access to AI analysis, <strong>all sales are final and non-refundable</strong> once the subscription is activated and the service is used.
                </p>
                <p>
                  However, we want you to be satisfied. If you experience critical technical issues that prevent you from using the core scanning features, you may request a refund within <strong>3 days</strong> of your initial purchase.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4 text-zinc-400">
                  <li>Refunds are not provided for partial months of service.</li>
                  <li>Refunds will not be granted if our system logs show that the AI scanner has been successfully used during the billing period.</li>
                  <li>Approved refunds will be processed to the original payment method within 5-7 business days via Razorpay.</li>
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
                Email: <span className="text-emerald-400 font-bold">support@scansafe.in</span><br />
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
