'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { supabase } from '@/lib/supabase'

export default function VercelAnalytics() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email?.toLowerCase()
      if (email && ['kirtanpatel2326@gmail.com', 'kirtanpatel2305@gmail.com'].includes(email)) {
        setIsAdmin(true)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email?.toLowerCase()
      if (email && ['kirtanpatel2326@gmail.com', 'kirtanpatel2305@gmail.com'].includes(email)) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <Analytics
      beforeSend={(event) => {
        // If the active user is an admin, reject the tracking event
        if (isAdmin) {
          return null
        }
        return event
      }}
    />
  )
}
