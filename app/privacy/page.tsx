'use client'

import React from 'react'
import Header from '@/components/Header'
import { Shield, Lock, Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black font-sans flex flex-col justify-between">
      <Header />
      
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Privacy <span className="text-emerald-400">Policy</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">
            Effective Date: May 27, 2026
          </p>
        </div>

        <div className="space-y-10 border border-zinc-900 bg-zinc-950/20 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-sm">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" /> 1. Information We Collect
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              ScanSafe ULTRA extracts and analyzes food product ingredients lists to provide personalized health insight. To perform these services, we collect the following categories of data:
            </p>
            <ul className="list-disc pl-6 text-zinc-400 text-xs space-y-2">
              <li>
                <strong className="text-zinc-200">Account Credentials:</strong> Email addresses and profiles synced during Google OAuth authentication.
              </li>
              <li>
                <strong className="text-zinc-200">Personal Health Metrics:</strong> Dietary preferences, allergen profiles (e.g. gluten-free, dairy-free), target medical warnings (e.g. diabetes, heart health), and ingredient blacklists that you voluntarily configure.
              </li>
              <li>
                <strong className="text-zinc-200">Product Scan Data:</strong> Barcodes, ingredients text, scanned image files, and composite meal compositions.
              </li>
              <li>
                <strong className="text-zinc-200">Payment Metadata:</strong> Transaction reference IDs via Razorpay for Pro upgrades (we do not collect or store credit card details).
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" /> 2. How We Use Your Data
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We process your personal information strictly to deliver core food intelligence features:
            </p>
            <ul className="list-disc pl-6 text-zinc-400 text-xs space-y-2">
              <li>Providing food toxicity, NOVA ultra-processed group (UPF), and glycemic indexing evaluations.</li>
              <li>Compiling personalized alerts and customized allergen notifications.</li>
              <li>Enabling composite Meal Composer analytics and historical trends.</li>
              <li>Caching scans to optimize processing performance and minimize external API quota expenditure.</li>
              <li>Verifying Razorpay payments to activate Pro membership scopes.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-emerald-400" /> 3. Data Deletion Rights
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We believe you should have complete control over your health data. You have the absolute right to view, modify, or permanently delete your records at any time:
            </p>
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-xs text-zinc-400 space-y-3 leading-relaxed">
              <p>
                To wipe your entire account data history from our systems, simply log in to your dashboard and proceed as follows:
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Go to the <strong className="text-zinc-200">Family Profiles</strong> tab inside the scanner page.</li>
                <li>Clear any secondary profile names and remove all entries from your ingredient blacklist.</li>
                <li>To completely delete your scan logs, clear your scans queue or send an account deletion email directly to <span className="text-emerald-400 underline">support@scansafe.in</span>.</li>
              </ol>
              <p className="text-zinc-500 italic mt-2">
                Upon request, your user record, associated profiles, and all scan logs will be permanently deleted from our live PostgreSQL databases within 48 hours.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-white">4. Data Sharing & Third-Party Services</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              ScanSafe ULTRA does not sell your private data to medical insurance companies, food manufacturers, or advertising brokers. Your information is only shared with standard processors required for billing and intelligence parsing:
            </p>
            <ul className="list-disc pl-6 text-zinc-400 text-xs space-y-1">
              <li><strong className="text-zinc-200">Supabase:</strong> For database hosting, authentication, and secure row storage.</li>
              <li><strong className="text-zinc-200">Google Gemini & Claude APIs:</strong> For secure OCR image/text ingredient structure extractions (no data is retained by these models for training purposes).</li>
              <li><strong className="text-zinc-200">Razorpay:</strong> To process secure UPI and card payments.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-white">5. Contact Information</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              If you have any questions regarding this Privacy Policy, cookie settings, or data processing, please contact us at:
            </p>
            <p className="text-xs text-zinc-500">
              Email: <span className="text-emerald-400 font-bold">privacy@scansafe.in</span><br />
              ScanSafe India Inc., Bangalore, Karnataka, India.
            </p>
          </section>
        </div>
      </main>

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
