import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { organizationId, userId } = await request.json()

    if (!organizationId || !userId) {
      return NextResponse.json({ error: "organizationId and userId are required" }, { status: 400 })
    }

    // Basic existence checks
    const [org, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ])

    if (!org || !user) {
      return NextResponse.json({ error: "Organization or user not found" }, { status: 404 })
    }

    // Ensure the user is a member of the org
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "You must be a member of this organization" }, { status: 403 })
    }

    const now = new Date()
    const farFuture = new Date("2999-12-31T00:00:00.000Z")

    const existing = await prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    })

    const subscription = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: "free",
            status: "active",
            paystackRef: null,
            currentPeriodStart: now,
            currentPeriodEnd: farFuture,
            canceledAt: null,
          },
        })
      : await prisma.subscription.create({
          data: {
            organizationId,
            plan: "free",
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: farFuture,
          },
        })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error("Error activating free subscription:", error)
    return NextResponse.json({ error: "Failed to activate free plan" }, { status: 500 })
  }
}

