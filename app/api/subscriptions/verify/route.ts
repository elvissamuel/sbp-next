import { prisma } from "@/lib/db"
import { verifyPayment } from "@/lib/paystack"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json()

    if (!reference) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 })
    }

    // Verify payment with Paystack
    const paystackResponse = await verifyPayment(reference)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
    }

    // Find payment record
    const payment = await prisma.payment.findUnique({
      where: { paystackRef: reference },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 })
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "successful" },
    })

    // Parse metadata to get subscription details
    const metadata = typeof payment.metadata === 'object' 
      ? payment.metadata 
      : typeof payment.metadata === 'string' 
      ? JSON.parse(payment.metadata) 
      : {}

    if (metadata.type === "subscription" && metadata.organizationId && metadata.plan) {
      // Calculate subscription period (1 month from now)
      const now = new Date()
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      // Find existing subscription for this organization
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          organizationId: metadata.organizationId as string,
        },
      })

      // Create or update subscription
      const subscription = existingSubscription
        ? await prisma.subscription.update({
            where: { id: existingSubscription.id },
            data: {
              plan: metadata.plan as string,
              status: "active",
              paystackRef: reference,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              canceledAt: null,
            },
          })
        : await prisma.subscription.create({
            data: {
              organizationId: metadata.organizationId as string,
              plan: metadata.plan as string,
              status: "active",
              paystackRef: reference,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          })

      return NextResponse.json({
        success: true,
        payment: updatedPayment,
        subscription,
        message: "Payment verified and subscription activated successfully",
      })
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: "Payment verified successfully",
    })
  } catch (error) {
    console.error("Error verifying subscription payment:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}

