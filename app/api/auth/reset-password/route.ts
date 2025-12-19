import { hashPassword, verifyPassword } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, token, newPassword } = await request.json()

    if (!userId || !token || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find reset record
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { userId },
    })

    if (!resetRecord) {
      return NextResponse.json({ error: "Password reset record not found" }, { status: 404 })
    }

    // Check if expired
    if (resetRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "Reset token expired" }, { status: 400 })
    }

    // Verify token
    const tokenValid = await verifyPassword(token, resetRecord.token)

    if (!tokenValid) {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 })
    }

    // Update password
    const hashedPassword = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    // Delete reset record
    await prisma.passwordReset.delete({
      where: { userId },
    })

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Error during password reset:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
