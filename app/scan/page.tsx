'use client'

import Link from 'next/link'

export default function HomePage() {
return ( <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6"> <h1 className="text-6xl font-black mb-6">
SCAN<span className="text-emerald-400">SAFE</span> </h1>

```
  <p className="text-gray-400 text-center max-w-xl mb-8 text-lg">
    AI-powered ingredient scanner that analyzes food products instantly.
  </p>

  <Link
    href="/scan"
    className="bg-emerald-500 text-black font-bold px-8 py-4 rounded-full hover:bg-emerald-400 transition"
  >
    Start Scanning
  </Link>
</main>


)
}
