import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, Users, MessageSquare, DollarSign, Loader } from 'lucide-react'

interface Tour {
  id: string
  name: string
  price_per_person: number
  flat_rate: boolean
  flat_rate_amount: number | null
}

export default function BookingForm() {
  const [user, setUser] = useState<any>(null)
  const [tours, setTours] = useState<Tour[]>([])
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [bookingDate, setBookingDate] = useState('')
  const [participants, setParticipants] = useState(1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadBookingData()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setError('')
      } else {
        setUser(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const loadBookingData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setError('Please sign in to make a booking')
        setLoading(false)
        return
      }
      setUser(currentUser)

      // Load tours
      const { data: toursData } = await supabase
        .from('tours')
        .select('id, name, price_per_person, flat_rate, flat_rate_amount')
        .eq('is_active', true)
        .order('name')

      if (toursData) {
        setTours(toursData)
        if (toursData.length > 0) {
          setSelectedTour(toursData[0])
        }
      }
    } catch (err) {
      console.error('Error loading booking data:', err)
      setError('Failed to load tours. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculatePrice = (): number => {
    if (!selectedTour) return 0
    if (selectedTour.flat_rate && selectedTour.flat_rate_amount) {
      return selectedTour.flat_rate_amount
    }
    return selectedTour.price_per_person * participants
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedTour || !bookingDate) {
      setError('Please fill in all required fields')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const estimatedPrice = calculatePrice()

      // Generate booking reference
      const bookingRef = `YX-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          tour_id: selectedTour.id,
          booking_date: bookingDate,
          number_of_participants: participants,
          special_requests: specialRequests || null,
          pickup_location: pickupLocation || null,
          estimated_price: estimatedPrice,
          booking_reference: bookingRef,
          status: 'pending',
        })
        .select()
        .single()

      if (bookingError) {
        throw bookingError
      }

      // Create payment record
      const deposit = estimatedPrice * 0.3 // 30% deposit
      const balance = estimatedPrice - deposit

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: booking.id,
          customer_id: user.id,
          amount: estimatedPrice,
          deposit_amount: deposit,
          balance_amount: balance,
          payment_status: 'pending',
          currency: 'USD',
        })

      if (paymentError) {
        throw paymentError
      }

      setSuccess(`Booking created successfully! Reference: ${bookingRef}`)

      // Reset form
      setBookingDate('')
      setParticipants(1)
      setSpecialRequests('')
      setPickupLocation('')

      // Redirect to checkout after a delay
      setTimeout(() => {
        window.location.href = `/checkout?booking=${booking.id}`
      }, 2000)
    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message || 'Failed to create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tours...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 mb-4">Please sign in to make a booking</p>
        <a href="/signup" className="inline-block px-6 py-2 bg-primary text-white rounded-md font-semibold hover:bg-green-700 transition-colors">
          Sign In
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {/* Tour Selection */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">1. Select a Tour</h3>
          <div className="space-y-3">
            {tours.map((tour) => (
              <label key={tour.id} className="flex items-start gap-3 p-4 border border-input rounded-lg cursor-pointer hover:bg-background transition-colors" style={{
                backgroundColor: selectedTour?.id === tour.id ? 'rgb(var(--primary-rgb) / 0.05)' : 'transparent',
                borderColor: selectedTour?.id === tour.id ? 'var(--primary)' : undefined
              }}>
                <input
                  type="radio"
                  name="tour"
                  value={tour.id}
                  checked={selectedTour?.id === tour.id}
                  onChange={() => setSelectedTour(tour)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{tour.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tour.flat_rate ? `$${tour.flat_rate_amount} flat rate` : `$${tour.price_per_person} per person`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Booking Details */}
        {selectedTour && (
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">2. Booking Details</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Booking Date
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                disabled={submitting}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                required
              />
            </div>

            {!selectedTour.flat_rate && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Number of Participants
                </label>
                <input
                  type="number"
                  value={participants}
                  onChange={(e) => setParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={submitting}
                  min="1"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Pickup Location (Optional)
              </label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                disabled={submitting}
                placeholder="e.g., Your hotel or meeting point"
                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Special Requests (Optional)
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                disabled={submitting}
                placeholder="Any dietary restrictions, accessibility needs, or special preferences..."
                rows={3}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Price Summary */}
        {selectedTour && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Tour Price:</span>
                <span className="text-lg font-semibold text-foreground">${calculatePrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>30% Deposit Due:</span>
                <span className="font-semibold">${(calculatePrice() * 0.3).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Balance Due on Tour Date:</span>
                <span className="font-semibold">${(calculatePrice() * 0.7).toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-secondary" />
                    Total Amount:
                  </span>
                  <span className="text-2xl font-bold text-primary">${calculatePrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !selectedTour || !bookingDate}
          className="w-full bg-secondary text-black py-3 px-6 rounded-lg font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Creating Booking...
            </>
          ) : (
            <>
              <DollarSign className="h-5 w-5" />
              Continue to Payment
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center">
          By clicking "Continue to Payment", you agree to our terms and conditions. A 30% deposit is required to confirm your booking.
        </p>
      </form>
    </div>
  )
}
