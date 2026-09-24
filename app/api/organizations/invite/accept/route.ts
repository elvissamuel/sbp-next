import { prisma } from "@/lib/db"
import { JOB_TITLES } from "@/lib/constants"
import { type NextRequest, NextResponse } from "next/server"

const ROLES = ["admin", "member", "instructor"] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const userId = typeof body.userId === "string" ? body.userId : ""
    const role = typeof body.role === "string" ? body.role.toLowerCase() : ""
    const departmentId = typeof body.departmentId === "string" ? body.departmentId : ""
    const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : ""

    if (!organizationId || !email || !userId || !role || !jobTitle) {
      return NextResponse.json({ error: "Organization, email, user, role, and job title are required" }, { status: 400 })
    }

    if (!JOB_TITLES.includes(jobTitle as (typeof JOB_TITLES)[number])) {
      return NextResponse.json({ error: "Select a job title" }, { status: 400 })
    }

    if (!ROLES.includes(role as (typeof ROLES)[number])) {
      return NextResponse.json({ error: "Role must be admin, instructor, or member" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Sign in with the invited email address" }, { status: 403 })
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        themePrimaryColor: true,
        themeSecondaryColor: true,
        themeAccentColor: true,
      },
    })

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    })

    if (departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: departmentId, organizationId },
      })
      if (!department) {
        return NextResponse.json({ error: "Select a department that belongs to this organization" }, { status: 400 })
      }
    }

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: "active",
        currentPeriodEnd: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!existingMember && activeSubscription?.plan === "free") {
      const memberCount = await prisma.organizationMember.count({
        where: { organizationId },
      })
      if (memberCount >= 3) {
        return NextResponse.json(
          { error: "This organization has reached its member limit." },
          { status: 403 }
        )
      }
    }

    const membershipRole =
      existingMember && ROLES.includes(existingMember.role as (typeof ROLES)[number])
        ? existingMember.role
        : role

    const member = existingMember
      ? await prisma.organizationMember.update({
          where: { id: existingMember.id },
          data: {
            status: "active",
            role: membershipRole,
            jobTitle,
            ...(departmentId ? { departmentId } : {}),
          },
        })
      : await prisma.organizationMember.create({
          data: {
            organizationId,
            userId: user.id,
            role: membershipRole,
            status: "active",
            jobTitle,
            ...(departmentId ? { departmentId } : {}),
            ...(membershipRole === "admin" && {
              adminPermissions: {
                canManageCourses: false,
                canManageMembers: false,
                canManageSettings: false,
                canManageDepartments: false,
                canManageLevels: false,
                canViewAnalytics: false,
                canManageGroups: false,
              },
            }),
          },
        })

    return NextResponse.json(
      {
        message: "You joined the organization",
        organization: {
          ...organization,
          role: member.role,
          joinedAt: member.joinedAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error accepting organization invite:", error)
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 })
  }
}
