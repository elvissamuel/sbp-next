import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Get all members of an organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> | { organizationId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 13+ vs 15+)
    const resolvedParams = await Promise.resolve(params)
    const organizationId = resolvedParams.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    })

    // Format response
    const formattedMembers = members.map((member) => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: member.user.name,
      role: member.role,
      joinedAt: member.joinedAt,
    }))

    return NextResponse.json(formattedMembers)
  } catch (error) {
    console.error("Error fetching organization members:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

