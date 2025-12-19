import { prisma } from "@/lib/db"
import { initializePayment } from "@/lib/paystack"
import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { userId, organizationId, plan, amount } = await request.json()

    if (!userId || !organizationId || !plan || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user and organization exist
    const [user, organization] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.organization.findUnique({ where: { id: organizationId } }),
    ])

    if (!user || !organization) {
      return NextResponse.json({ error: "User or organization not found" }, { status: 404 })
    }

    if (!user.email) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    // Generate unique reference
    const reference = `sub_${uuidv4()}`

    // Get callback URL
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const callbackUrl = `${origin}/api/payments/callback`

    // Initialize Paystack payment
    const paystackResponse = await initializePayment(
      user.email,
      amount,
      reference,
      {
        userId,
        organizationId,
        plan,
        type: "subscription",
      },
      callbackUrl
    )

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: "NGN",
        status: "pending",
        paystackRef: reference,
        metadata: {
          organizationId,
          plan,
          type: "subscription",
          description: `Subscription payment for ${plan} plan`,
        },
      },
    })

    return NextResponse.json({
      paymentId: payment.id,
      authorizationUrl: paystackResponse.data.authorization_url,
      reference: paystackResponse.data.reference,
      accessCode: paystackResponse.data.access_code,
    })
  } catch (error) {
    console.error("Error initializing subscription payment:", error)
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 })
  }
}

