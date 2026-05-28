'use client'

import React from 'react'
import Header from '@/components/Header'
import { FileText, Scale, AlertTriangle, BadgeAlert, Coins, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black font-sans flex flex-col justify-between">
      <div>
        <Header />
        
        <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-4">
              <Scale className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
              Terms of <span className="text-emerald-400">Service</span>
            </h1>
            <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">
              Last Updated: May 27, 2026
            </p>
          </div>

          <div className="space-y-10 border border-zinc-900 bg-zinc-950/20 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-sm">
            
            {/* Section 1: Medical Disclaimer */}
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-emerald-400" /> 1. Important Medical Disclaimer
              </h2>
              <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-5 text-xs text-zinc-300 space-y-2 leading-relaxed">
                <p className="font-bold text-red-400 flex items-center gap-1.5">
                  <BadgeAlert className="w-4 h-4 text-red-400 flex-shrink-0" /> READ CAREFULLY: NOT MEDICAL ADVICE
                </p>
                <p>
                  ScanSafe ULTRA (the "App", "Service", "we", "our") parses and evaluates food labels, ingredient lists, and nutritional panels using automated optical character recognition (OCR) and generative AI models. 
                </p>
                <p>
                  All generated scores, dietary matching results, and warnings are for educational and informational purposes only. The Service does not provide medical advice, diagnosis, or treatment. It is not a substitute for professional healthcare assessment or verified medical-grade dietary guidance. Always consult with a qualified medical practitioner before changing your diet, or if you have severe food allergies or medical conditions.
                </p>
              </div>
            </section>

            {/* Section 2: Acceptance of Terms */}
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" /> 2. Acceptance & Use
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                By accessing or using ScanSafe, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must immediately cease using the platform.
              </p>
              <ul className="list-disc pl-6 text-zinc-400 text-xs space-y-2">
                <li>
                  <strong className="text-zinc-200">Eligibility:</strong> You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to use our platform.
                </li>
                <li>
                  <strong className="text-zinc-200">Account Security:</strong> You are responsible for maintaining the confidentiality of your Google OAuth login credentials and all scanner activity under your account.
                </li>
              </ul>
            </section>

            {/* Section 3: Billing, Payments, and Upgrades */}
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" /> 3. Pro Subscription & Razorpay Gateway
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                We offer free trial usage and a premium tier ("ScanSafe Pro") via one-time or recurring payments processed through Razorpay.
              </p>
              <ul className="list-disc pl-6 text-zinc-400 text-xs space-y-2">
                <li>
                  <strong className="text-zinc-200">Billing Policies:</strong> All transaction records and details are secured. Payments are processed securely via UPI, cards, or net banking.
                </li>
                <li>
                  <strong className="text-zinc-200">₹1 Promo Trial:</strong> For promotional trials, your card or UPI channel is charged ₹1 to verify credentials. No recurring auto-debits are configured without explicit consent.
                </li>
                <li>
                  <strong className="text-zinc-200">Refunds:</strong> Refund requests for one-time Pro upgrades must be submitted within 7 days of payment to <span className="text-emerald-400 underline">support@scansafe.in</span>. Valid refunds will be processed to the original payment channel.
                </li>
              </ul>
            </section>

            {/* Section 4: Fair Use & Prohibited Conduct */}
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-white">4. API Fair Use & Rate Limiting</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                To guarantee service quality and prevent quota depletion, we enforce IP-based rate limiting on all scanning routes. Users agree NOT to:
              </p>
              <ul className="list-disc pl-6 text-zinc-400 text-xs space-y-1">
                <li>Circumvent rate limiting controls or access APIs through automated scripts or bots.</li>
                <li>Upload corrupted, malicious, or non-food ingredient images.</li>
                <li>Scrape, reverse-engineer, or duplicate ScanSafe OCR and rating logic for commercial competition.</li>
              </ul>
            </section>

            {/* Section 5: Governing Law & Dispute Resolution */}
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-white">5. Governing Law</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Bangalore, Karnataka, India.
              </p>
            </section>

            {/* Section 6: Contact Support */}
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" /> 6. Customer Support & Inquiries
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                If you encounter payment failures, account syncing bugs, or have general terms inquiries, reach out to our team at:
              </p>
              <p className="text-xs text-zinc-500">
                Email: <span className="text-emerald-400 font-bold">support@scansafe.in</span><br />
                ScanSafe India Inc., Bangalore, Karnataka, India.
              </p>
            </section>
          </div>
        </main>
      </div>

      {/* Shared Compliance Footer */}
      <footer className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 border-t border-zinc-900/60 text-center text-zinc-500 text-xs mt-12">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} ScanSafe. All rights reserved. Safeguarding diets, one label at a time.</p>
      </footer>
    </div>
  )
}
