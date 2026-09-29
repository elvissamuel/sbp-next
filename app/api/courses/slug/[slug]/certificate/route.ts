import { prisma } from "@/lib/db"
import { calculateCourseProgress } from "@/lib/progress-calculator"
import { getUserFullName } from "@/lib/utils/user"
import { type NextRequest, NextResponse } from "next/server"

function memberTitle(role: string) {
  if (role === "superadmin") return "Director"
  if (role === "admin") return "Administrator"
  return "Instructor"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const slug = resolvedParams.slug
    const userId = request.nextUrl.searchParams.get("userId")

    if (!slug) {
      return NextResponse.json({ error: "Course slug is required" }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const matches = await prisma.course.findMany({
      where: { OR: [{ slug }, { id: slug }] },
      include: { organization: true },
    })
    if (matches.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId: { in: matches.map((item) => item.id) } },
    })
    const course = matches.find((item) => item.id === enrollment?.courseId)
    if (!enrollment || !course) {
      return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 404 })
    }

    const progressData = await calculateCourseProgress(userId, course.id)
    if (!progressData.certificateEligible) {
      return NextResponse.json(
        { error: "Your certificate is available after you complete this course." },
        { status: 403 }
      )
    }

    const completedAt = enrollment.completedAt ?? progressData.earnedAt ?? new Date()
    if (enrollment.status !== "completed" || !enrollment.completedAt) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: "completed", completedAt },
      })
    }

    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, name: true, email: true },
    })
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const leaders = await prisma.organizationMember.findMany({
      where: {
        organizationId: course.organizationId,
        status: "active",
        role: { in: ["superadmin", "admin"] },
      },
      include: {
        user: {
          select: { firstName: true, lastName: true, name: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    })

    const ranked = [...leaders].sort((a, b) => {
      const rank = (role: string) => (role === "superadmin" ? 0 : 1)
      return rank(a.role) - rank(b.role)
    })

    const signatures: Array<{ name: string; title: string }> = []
    for (const leader of ranked) {
      if (signatures.length >= 2) break
      const name = getUserFullName(leader.user.firstName, leader.user.lastName, leader.user.name)
      if (!name || signatures.some((signature) => signature.name === name)) continue
      signatures.push({ name, title: memberTitle(leader.role) })
    }
    if (signatures.length < 2 && !signatures.some((signature) => signature.name === course.organization.name)) {
      signatures.push({ name: course.organization.name, title: "Organization" })
    }

    return NextResponse.json({
      organizationName: course.organization.name,
      themePrimaryColor: course.organization.themePrimaryColor,
      themeSecondaryColor: course.organization.themeSecondaryColor,
      courseTitle: course.title,
      studentName: getUserFullName(student.firstName, student.lastName, student.name) || student.email,
      completedAt: completedAt.toISOString(),
      signatures,
    })
  } catch (error) {
    console.error("Error building course certificate:", error)
    return NextResponse.json({ error: "Failed to build certificate" }, { status: 500 })
  }
}
