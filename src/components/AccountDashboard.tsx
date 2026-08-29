import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LogOut, User, Loader } from 'lucide-react'

interface Customer {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  country: string | null
  state_province: string | null
  special_requirements: string | null
}

interface Booking {
  id: string
  booking_reference: string | null
  booking_date: string
  number_of_participants: number
  estimated_price: number
  status: string
  tour_id: string
  special_requests: string | null
}

interface Tour {
  id: string
  name: string
  price_per_person: number
}

export default function AccountDashboard() {
  const [user, setUser] = useState<any>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tours, setTours] = useState<Record<string, Tour>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<Customer>>({})

  useEffect(() => {
    loadAccountData()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setError('Session expired. Please sign in again.')
        setTimeout(() => {
          window.location.href = '/signup'
        }, 2000)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const loadAccountData = async () => {
    try {
      setLoading(true)
      setError('')

      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        setError('Not authenticated. Redirecting to sign in...')
        setTimeout(() => {
          window.location.href = '/signup'
        }, 2000)
        return
      }

      setUser(currentUser)

      // Load customer profile
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (customerData) {
        setCustomer(customerData)
        setFormData(customerData)
      }

      // Load bookings
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', currentUser.id)
        .order('booking_date', { ascending: false })

      if (bookingData) {
        setBookings(bookingData)

        // Load tour details for all bookings
        const tourIds = [...new Set(bookingData.map((b) => b.tour_id))]
        if (tourIds.length > 0) {
          const { data: tourData } = await supabase
            .from('tours')
            .select('id, name, price_per_person')
            .in('id', tourIds)

          if (tourData) {
            const tourMap = tourData.reduce((acc: Record<string, Tour>, tour: Tour) => {
              acc[tour.id] = tour
              return acc
            }, {})
            setTours(tourMap)
          }
        }
      }
    } catch (err) {
      console.error('Error loading account data:', err)
      setError('Failed to load account data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setError(error.message)
      } else {
        window.location.href = '/'
      }
    } catch (err) {
      setError('Failed to sign out')
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('customers')
        .update(formData)
        .eq('id', user.id)

      if (error) {
        setError(error.message)
      } else {
        setCustomer({ ...customer, ...formData } as Customer)
        setEditMode(false)
        setError('')
      }
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-card rounded-lg border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <User className="h-6 w-6" />
            My Profile
          </h2>
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 text-sm font-semibold text-primary hover:text-green-700 border border-primary rounded-md hover:bg-primary/5 transition-colors"
          >
            {editMode ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {!editMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="text-lg font-semibold text-foreground">{customer?.full_name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-semibold text-foreground">{customer?.email || user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="text-lg font-semibold text-foreground">{customer?.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <p className="text-lg font-semibold text-foreground">{customer?.country || 'Not provided'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Special Requirements</p>
              <p className="text-lg font-semibold text-foreground">{customer?.special_requirements || 'None'}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">State/Province</label>
                <input
                  type="text"
                  value={formData.state_province || ''}
                  onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Special Requirements</label>
              <textarea
                value={formData.special_requirements || ''}
                onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Any dietary restrictions, accessibility needs, etc."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-md font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 py-2 border border-border rounded-md font-semibold hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bookings Section */}
      <div className="bg-card rounded-lg border border-border p-6 mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">My Bookings</h2>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No bookings yet</p>
            <a href="/tours" className="inline-block px-6 py-2 bg-primary text-white rounded-md font-semibold hover:bg-green-700 transition-colors">
              Browse Tours
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const tour = tours[booking.tour_id]
              return (
                <div key={booking.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Booking Reference</p>
                      <p className="font-semibold text-foreground">{booking.booking_reference || booking.id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tour</p>
                      <p className="font-semibold text-foreground">{tour?.name || 'Loading...'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold text-foreground">{new Date(booking.booking_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Participants</p>
                      <p className="font-semibold text-foreground">{booking.number_of_participants}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  {booking.special_requests && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">Special Requests:</p>
                      <p>{booking.special_requests}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
