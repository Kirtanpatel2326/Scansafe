'use client'
import { signInWithGoogle } from '@/lib/supabase'

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 rounded-2xl p-10 text-center max-w-sm w-full border border-gray-800">
        <h1 className="text-3xl font-black tracking-wider text-white mb-2">
          SCAN<span className="text-emerald-400">SAFE</span>
        </h1>
        <p className="text-gray-400 text-sm mb-8">Know what's inside your food</p>
        <button
          onClick={signInWithGoogle}
          className="w-full bg-white text-gray-900 font-semibold py-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
          Continue with Google
        </button>
        <p className="text-gray-600 text-xs mt-6">5 free scans/day · No credit card needed</p>
      </div>
    </div>
  )
}
