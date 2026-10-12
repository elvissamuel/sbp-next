import { hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

const genericResponse = {
  message: "If an account exists for that email, a reset link has been sent.",
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    })

    if (!user?.email) {
      return NextResponse.json(genericResponse)
    }

    const resetToken = uuidv4()
    const hashedToken = await hashPassword(resetToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: { token: hashedToken, expiresAt },
      create: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BROWSER_URL || "http://localhost:3000"
    const resetLink = `${baseUrl}/auth/reset-password/${user.id}/${resetToken}`
    const name = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name,
        resetLink,
      })
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
      await prisma.passwordReset.delete({ where: { userId: user.id } }).catch(() => undefined)
      return NextResponse.json({ error: "Could not send the reset email. Please try again." }, { status: 500 })
    }

    return NextResponse.json(genericResponse)
  } catch (error) {
    console.error("Error during forgot password:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
