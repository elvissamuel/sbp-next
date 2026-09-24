import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

type Params = { id: string }

async function getCourseId(params: Promise<Params> | Params) {
  const resolved = await Promise.resolve(params)
  return resolved.id
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const courseId = await getCourseId(params)
    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" } } },
    })
    return NextResponse.json(modules)
  } catch (error) {
    console.error("Error fetching modules:", error)
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> | Params }
) {
  try {
    const courseId = await getCourseId(params)
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""

    if (!title) {
      return NextResponse.json({ error: "Module title is required" }, { status: 400 })
    }

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const count = await prisma.module.count({ where: { courseId } })
    const module = await prisma.module.create({
      data: {
        courseId,
        title,
        description: description || null,
        order: count,
      },
    })

    return NextResponse.json(module, { status: 201 })
  } catch (error) {
    console.error("Error creating module:", error)
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 })
  }
}
