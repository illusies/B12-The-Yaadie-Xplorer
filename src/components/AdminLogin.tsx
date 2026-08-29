import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign in with email/password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      if (!data.user) {
        setError('Login failed. Please try again.')
        return
      }

      // Check if user is an admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('email')
        .eq('email', email)
        .single()

      if (adminError || !adminData) {
        setError('You do not have admin access. Please contact support.')
        // Sign out if not admin
        await supabase.auth.signOut()
        return
      }

      // Redirect to admin dashboard
      window.location.href = '/admin/dashboard'
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-card rounded-lg border border-border p-8 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Access</h1>
        <p className="text-muted-foreground">Sign in to manage bookings and payments</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label htmlFor="admin-email" className="block text-sm font-medium text-foreground mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-muted-foreground" size={18} />
            <input
              type="email"
              id="admin-email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
            <input
              type="password"
              id="admin-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 px-4 rounded-md font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing In...' : 'Admin Sign In'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        <a href="/" className="text-primary hover:text-green-700 font-semibold">
          Back to Home
        </a>
      </p>
    </div>
  )
}
