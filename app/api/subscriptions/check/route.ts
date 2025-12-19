import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Find active subscription for the organization
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: "active",
        currentPeriodEnd: {
          gte: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      hasSubscription: !!subscription,
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    })
  } catch (error) {
    console.error("Error checking subscription:", error)
    return NextResponse.json({ error: "Failed to check subscription" }, { status: 500 })
  }
}

