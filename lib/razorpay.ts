import Razorpay from 'razorpay'

// Initialize Razorpay client
// It will throw an error if keys are not defined, so we check them
const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET

export const razorpay = new Razorpay({
  key_id: keyId || 'mock_key_id',
  key_secret: keySecret || 'mock_key_secret',
})
