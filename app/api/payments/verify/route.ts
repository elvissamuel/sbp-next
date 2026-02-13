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

    // Create enrollment if payment successful
    const metadata = JSON.parse(payment.metadata || "{}")
    if (metadata.courseId && payment.userId) {
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: metadata.courseId,
          },
        },
        update: { status: "active" },
        create: {
          userId: payment.userId,
          courseId: metadata.courseId,
          status: "active",
        },
      })
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      message: "Payment verified successfully",
    })
  } catch (error) {
    console.error("Error verifying payment:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
