import { hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({ message: "If email exists, reset link will be sent" })
    }

    // Generate reset token
    const resetToken = uuidv4()
    const hashedToken = await hashPassword(resetToken)

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      },
    })

    // TODO: Send password reset email with token
    console.log("[v0] Password reset token:", resetToken)

    return NextResponse.json({ message: "If email exists, reset link will be sent" })
  } catch (error) {
    console.error("Error during forgot password:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
