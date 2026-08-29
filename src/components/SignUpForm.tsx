import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'

export default function SignUpForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const authDomain = import.meta.env.PUBLIC_AUTH_DOMAIN
      if (!authDomain) {
        throw new Error('Auth domain not configured')
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `https://${authDomain}/auth/callback`,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Account created! Check your email to confirm.')
        setFullName('')
        setEmail('')
        setPassword('')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setLoading(true)

    try {
      const authDomain = import.meta.env.PUBLIC_AUTH_DOMAIN
      if (!authDomain) {
        throw new Error('Auth domain not configured')
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `https://${authDomain}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('Failed to sign up with Google')
    } finally {
      setLoading(false)
    }
  }

  const handleAppleSignUp = async () => {
    setError('')
    setLoading(true)

    try {
      const authDomain = import.meta.env.PUBLIC_AUTH_DOMAIN
      if (!authDomain) {
        throw new Error('Auth domain not configured')
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `https://${authDomain}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('Failed to sign up with Apple')
    } finally {
      setLoading(false)
    }
  }


  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <div>
        <label htmlFor="signup-name" className="block text-sm font-medium text-foreground mb-2">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <input
            type="text"
            id="signup-name"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-foreground mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <input
            type="email"
            id="signup-email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-foreground mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <input
            type="password"
            id="signup-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
            required
            minLength={6}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">At least 6 characters</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-secondary text-black py-2 px-4 rounded-md font-semibold hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
        {!loading && <ArrowRight size={18} />}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">Or sign up with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={loading}
        className="w-full bg-white text-black py-2 px-4 rounded-md font-semibold border border-border hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Create Account with Google
      </button>

      <button
        type="button"
        onClick={handleAppleSignUp}
        disabled={loading}
        className="w-full bg-black text-white py-2 px-4 rounded-md font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 13.5c-.91 0-1.74-.46-2.25-1.15.97-.55 1.71-1.68 1.71-2.99 0-1.87-1.48-3.4-3.3-3.4-1.27 0-2.37.72-2.92 1.78-.32-.05-.65-.08-.99-.08-3.05 0-5.52 2.46-5.52 5.5 0 3.04 2.47 5.5 5.52 5.5.98 0 1.92-.27 2.73-.76 1.28.8 2.81 1.27 4.49 1.27 2.88 0 5.36-1.63 6.63-4 .43-1.07.67-2.23.67-3.46 0-4.24-3.22-7.71-7.26-7.99-.07-.48-.51-.85-1.04-.85-1.03 0-1.86.83-1.86 1.86s.83 1.86 1.86 1.86c1.03 0 1.86-.83 1.86-1.86" />
        </svg>
        Create Account with Apple
      </button>
    </form>
  )
}
