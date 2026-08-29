import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const [message, setMessage] = useState('Authenticating...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current session to verify auth state
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setMessage('Authentication error. Redirecting...')
          setTimeout(() => {
            window.location.href = '/sign-in'
          }, 2000)
          return
        }

        if (session) {
          setMessage('Authentication successful! Redirecting to dashboard...')
          // Redirect to dashboard or account page
          setTimeout(() => {
            window.location.href = '/account'
          }, 1000)
        } else {
          // No session, redirect to sign in
          window.location.href = '/sign-in'
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setMessage('Error during authentication.')
        setTimeout(() => {
          window.location.href = '/sign-in'
        }, 2000)
      }
    }

    handleAuthCallback()
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="text-lg text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
