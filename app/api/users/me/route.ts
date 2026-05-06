import { prisma } from "@/lib/db"
import { resolveFirstLastForProfile } from "@/lib/utils/user"
import { type NextRequest, NextResponse } from "next/server"

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const resolved = resolveFirstLastForProfile(user.firstName, user.lastName, user.name)
    const displayName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.name?.trim() ||
          [resolved.firstName, resolved.lastName].filter(Boolean).join(" ").trim() ||
          null

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: resolved.firstName || null,
      lastName: resolved.lastName || null,
      name: displayName,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, firstName, lastName, email } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const trimmedFirst = typeof firstName === "string" ? firstName.trim() : ""
    const trimmedLast = typeof lastName === "string" ? lastName.trim() : ""
    const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : ""

    if (!trimmedFirst || !trimmedLast) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      )
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (trimmedEmail !== existing.email.toLowerCase()) {
      const emailTaken = await prisma.user.findFirst({
        where: {
          email: trimmedEmail,
          NOT: { id: userId },
        },
        select: { id: true },
      })
      if (emailTaken) {
        return NextResponse.json({ error: "That email is already in use" }, { status: 409 })
      }
    }

    const displayName = `${trimmedFirst} ${trimmedLast}`.trim()

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: trimmedFirst,
        lastName: trimmedLast,
        name: displayName,
        email: trimmedEmail,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
      },
    })

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      name:
        updated.firstName && updated.lastName
          ? `${updated.firstName} ${updated.lastName}`.trim()
          : updated.name,
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
