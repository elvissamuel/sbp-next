import { verifyPassword } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, token } = await request.json()

    if (!userId || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { userId },
    })

    if (!verification) {
      return NextResponse.json({ error: "Verification record not found" }, { status: 404 })
    }

    // Check if expired
    if (verification.expiresAt < new Date()) {
      return NextResponse.json({ error: "Verification token expired" }, { status: 400 })
    }

    // Verify token
    const tokenValid = await verifyPassword(token, verification.token)

    if (!tokenValid) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    })

    // Delete verification record
    await prisma.emailVerification.delete({
      where: { userId },
    })

    return NextResponse.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Error during email verification:", error)
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 })
  }
}
