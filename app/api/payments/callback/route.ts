import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyPayment } from "@/lib/paystack"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get("reference")

    if (!reference) {
      // No reference means user cancelled or error
      return NextResponse.redirect(new URL("/?payment=cancelled", request.url))
    }

    // Verify payment with Paystack
    const paystackResponse = await verifyPayment(reference)

    if (!paystackResponse.status || paystackResponse.data.status !== "success") {
      return NextResponse.redirect(new URL("/?payment=failed", request.url))
    }

    // Find payment record
    const payment = await prisma.payment.findUnique({
      where: { paystackRef: reference },
    })

    if (!payment) {
      return NextResponse.redirect(new URL("/?payment=error", request.url))
    }

    // Update payment status
    await prisma.payment.update({
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
      if (existingSubscription) {
        await prisma.subscription.update({
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
      } else {
        await prisma.subscription.create({
          data: {
            organizationId: metadata.organizationId as string,
            plan: metadata.plan as string,
            status: "active",
            paystackRef: reference,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        })
      }
    }

    // Redirect to success page
    return NextResponse.redirect(new URL("/?payment=success", request.url))
  } catch (error) {
    console.error("Error handling payment callback:", error)
    return NextResponse.redirect(new URL("/?payment=error", request.url))
  }
}

