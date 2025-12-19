const PAYSTACK_BASE_URL = "https://api.paystack.co"
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY environment variable is not set")
}

interface PaystackInitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    reference: string
    amount: number
    paid_at: string
    customer: {
      id: number
      email: string
      code: string
      first_name: string | null
      last_name: string | null
    }
    status: string
  }
}

// Initialize payment
export async function initializePayment(
  email: string,
  amount: number,
  reference: string,
  metadata?: Record<string, any>,
  callbackUrl?: string,
): Promise<PaystackInitializeResponse> {
  const body: any = {
    email,
    amount: Math.round(amount * 100), // Convert to kobo
    reference,
    metadata,
  }
  
  if (callbackUrl) {
    body.callback_url = callbackUrl
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Paystack API error: ${response.statusText}`)
  }

  return response.json()
}

// Verify payment
export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Paystack API error: ${response.statusText}`)
  }

  return response.json()
}

// Create payment plan (for subscriptions)
export async function createPaymentPlan(
  name: string,
  interval: "monthly" | "quarterly" | "half-annual" | "annual",
  amount: number,
): Promise<any> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      interval,
      amount: Math.round(amount * 100),
    }),
  })

  if (!response.ok) {
    throw new Error(`Paystack API error: ${response.statusText}`)
  }

  return response.json()
}

// Get transaction
export async function getTransaction(transactionId: number): Promise<any> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/${transactionId}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Paystack API error: ${response.statusText}`)
  }

  return response.json()
}
