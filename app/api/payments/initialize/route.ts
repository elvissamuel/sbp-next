import { prisma } from "@/lib/db"
import { initializePayment } from "@/lib/paystack"
import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { userId, courseId, amount } = await request.json()

    if (!userId || !courseId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user and course exist
    const [user, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.course.findUnique({ where: { id: courseId } }),
    ])

    if (!user || !course) {
      return NextResponse.json({ error: "User or course not found" }, { status: 404 })
    }

    // Generate unique reference
    const reference = uuidv4()

    // Initialize Paystack payment
    const paystackResponse = await initializePayment(user.email!, amount, reference, {
      userId,
      courseId,
      courseName: course.title,
    })

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: course.currency,
        status: "pending",
        paystackRef: reference,
        metadata: {
          courseId,
          courseName: course.title,
          description: `Payment for course: ${course.title}`,
          accessCode: paystackResponse.data.access_code,
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
    console.error("Error initializing payment:", error)
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 })
  }
}
