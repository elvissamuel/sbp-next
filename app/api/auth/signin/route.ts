import { verifyPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
// import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    // const passwordValid = await verifyPassword(password, user.password || "")

    // if (!passwordValid) {
    //   return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    // }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email first",
          userId: user.id,
          requiresEmailVerification: true,
        },
        { status: 403 },
      )
    }

    // Get user's organizations
    const organizationMembers = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    })

    // Format organizations with user's role
    const organizations = organizationMembers.map((member) => ({
      id: member.organization.id,
      name: member.organization.name,
      slug: member.organization.slug,
      logo: member.organization.logo,
      role: member.role,
      joinedAt: member.joinedAt,
    }))

    // Return user info with organizations (in production, create session/JWT here)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organizations,
      message: "Signed in successfully",
    })
  } catch (error) {
    console.error("Error during signin:", error)
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 })
  }
}
