import { prisma } from "@/lib/db"
import { plainTextToLessonHtml } from "@/lib/course-outline"
import { generateSlug } from "@/lib/utils"
import { SaveCourseOutlineSchema } from "@/lib/validation-schema"
import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const outline = SaveCourseOutlineSchema.parse(body)

    const existingCourse = await prisma.course.findFirst({
      where: { organizationId: outline.organizationId, title: outline.title.trim() },
    })
    if (existingCourse) {
      return NextResponse.json(
        { error: "A course with this title already exists in your organization" },
        { status: 400 },
      )
    }

    let slug = generateSlug(outline.title)
    let slugCounter = 1
    while (
      await prisma.course.findUnique({
        where: { organizationId_slug: { organizationId: outline.organizationId, slug } },
      })
    ) {
      slug = `${generateSlug(outline.title)}-${slugCounter}`
      slugCounter++
    }

    const course = await prisma.$transaction(async (tx) => {
      const created = await tx.course.create({
        data: {
          organizationId: outline.organizationId,
          title: outline.title.trim(),
          description: outline.description.trim(),
          slug,
          status: "draft",
          level: "beginner",
          price: 0,
          currency: "NGN",
        },
      })

      for (const [moduleIndex, module] of outline.modules.entries()) {
        const createdModule = await tx.module.create({
          data: {
            courseId: created.id,
            title: module.title.trim(),
            description: module.description?.trim() || null,
            order: moduleIndex,
          },
        })

        await tx.lesson.createMany({
          data: module.lessons.map((lesson, lessonIndex) => ({
            courseId: created.id,
            moduleId: createdModule.id,
            title: lesson.title.trim(),
            content: plainTextToLessonHtml(lesson.content?.trim() || lesson.title.trim()),
            order: lessonIndex,
            status: "draft",
          })),
        })
      }

      return created
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error("Error saving course outline:", error)
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.errors.map((err) => err.message).join(", ") },
        { status: 400 },
      )
    }
    const message = error instanceof Error ? error.message : "Failed to save the course"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
