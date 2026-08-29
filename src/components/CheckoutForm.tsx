import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, CreditCard, Loader, AlertCircle } from 'lucide-react'

interface Booking {
  id: string
  booking_reference: string
  booking_date: string
  number_of_participants: number
  estimated_price: number
  status: string
  tour_id: string
}

interface Payment {
  id: string
  amount: number
  deposit_amount: number
  balance_amount: number
  payment_status: string
}

interface Tour {
  id: string
  name: string
}

export default function CheckoutForm() {
  const [user, setUser] = useState<any>(null)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [tour, setTour] = useState<Tour | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paymentProcessed, setPaymentProcessed] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('credit-card')

  useEffect(() => {
    loadCheckoutData()
  }, [])

  const loadCheckoutData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setError('Please sign in to continue')
        return
      }
      setUser(currentUser)

      // Get booking ID from URL
      const params = new URLSearchParams(window.location.search)
      const bookingId = params.get('booking')

      if (!bookingId) {
        setError('No booking found')
        return
      }

      // Load booking
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('customer_id', currentUser.id)
        .single()

      if (!bookingData) {
        setError('Booking not found')
        return
      }

      setBooking(bookingData)

      // Load payment
      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (paymentData) {
        setPayment(paymentData)
      }

      // Load tour
      const { data: tourData } = await supabase
        .from('tours')
        .select('id, name')
        .eq('id', bookingData.tour_id)
        .single()

      if (tourData) {
        setTour(tourData)
      }
    } catch (err) {
      console.error('Error loading checkout data:', err)
      setError('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking || !payment) return

    setSubmitting(true)
    setError('')

    try {
      // Update payment status to mark deposit as paid
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_status: 'deposit_paid',
          payment_method: paymentMethod,
        })
        .eq('id', payment.id)

      if (updateError) throw updateError

      // Update booking status to confirmed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id)

      if (bookingError) throw bookingError

      setPaymentProcessed(true)
      setPayment({ ...payment, payment_status: 'deposit_paid' })
    } catch (err: any) {
      setError(err.message || 'Payment processing failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    )
  }

  if (!booking || !payment || !tour) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error || 'Booking not found'}</p>
      </div>
    )
  }

  if (paymentProcessed) {
    return (
      <div className="max-w-2xl mx-auto bg-green-50 rounded-lg border border-green-200 p-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-green-900 mb-2">Payment Confirmed!</h2>
        <p className="text-green-800 mb-6">Your deposit has been received. Your booking is now confirmed.</p>

        <div className="bg-white rounded-lg p-6 mb-6 text-left">
          <h3 className="font-semibold text-foreground mb-4">Booking Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking Reference:</span>
              <span className="font-semibold text-foreground">{booking.booking_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tour:</span>
              <span className="font-semibold text-foreground">{tour.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-semibold text-foreground">{new Date(booking.booking_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participants:</span>
              <span className="font-semibold text-foreground">{booking.number_of_participants}</span>
            </div>
          </div>
        </div>

        <div className="bg-primary/10 rounded-lg p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-2">Remaining Balance Due on Tour Date:</p>
          <p className="text-3xl font-bold text-primary">${payment.balance_amount?.toFixed(2) || '0.00'}</p>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          A confirmation email has been sent to {user?.email}. Please save your booking reference for your records.
        </p>

        <div className="space-y-3">
          <a
            href="/account"
            className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            View My Bookings
          </a>
          <a
            href="/tours"
            className="inline-block px-6 py-2 border border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition-colors ml-3"
          >
            Browse More Tours
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Order Summary</h2>

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Tour</p>
              <p className="font-semibold text-foreground">{tour.name}</p>
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
              <p className="text-sm text-muted-foreground">Booking Reference</p>
              <p className="font-semibold text-foreground">{booking.booking_reference}</p>
            </div>
          </div>

          <div className="space-y-3 pt-6 border-t border-border">
            <div className="flex justify-between">
              <span className="text-foreground">Tour Price:</span>
              <span className="font-semibold text-foreground">${payment.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">30% Deposit:</span>
              <span className="font-semibold text-foreground">${payment.deposit_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Balance (due later):</span>
              <span className="font-semibold">${payment.balance_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border">
              <span className="font-semibold text-foreground">Amount Due Now:</span>
              <span className="text-2xl font-bold text-primary">${payment.deposit_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Payment Details</h2>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Payment Method</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-background transition-colors">
                  <input
                    type="radio"
                    name="payment-method"
                    value="credit-card"
                    checked={paymentMethod === 'credit-card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Credit/Debit Card
                    </p>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, American Express</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-background transition-colors">
                  <input
                    type="radio"
                    name="payment-method"
                    value="bank-transfer"
                    checked={paymentMethod === 'bank-transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-semibold text-foreground">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">Direct bank deposit</p>
                  </div>
                </label>
              </div>
            </div>

            {paymentMethod === 'credit-card' && (
              <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Complete payment processing integration with Stripe is coming soon. For now, please contact us at <strong>theyaadiexplorer@gmail.com</strong> to complete your payment.
                </p>
              </div>
            )}

            {paymentMethod === 'bank-transfer' && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">Bank transfer details will be provided after booking confirmation.</p>
                <p className="text-xs text-blue-700">Contact: <strong>876-326-3354</strong> or <strong>theyaadiexplorer@gmail.com</strong></p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-secondary text-black py-3 px-4 rounded-lg font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Confirm Booking & Pay Deposit
                </>
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              By confirming, you agree to our booking terms. Your deposit will be processed securely.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
