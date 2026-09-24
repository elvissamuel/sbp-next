import { generateLessonContent } from "@/lib/ai"
import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { courseId, topic, courseLevel } = await request.json()

    if (!courseId || !topic || !courseLevel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    })

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    let targetModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: "asc" },
    })
    if (!targetModule) {
      targetModule = await prisma.module.create({
        data: { courseId, title: "Module 1", order: 0 },
      })
    }

    // Generate content, including course title for context
    const content = await generateLessonContent(topic, courseLevel, undefined, course.title)

    // Save to database
    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        moduleId: targetModule.id,
        title: topic,
        content,
        order: await prisma.lesson.count({ where: { moduleId: targetModule.id } }),
      },
    })

    // Log generation
    await prisma.contentGeneration.create({
      data: {
        organizationId: course.organizationId,
        courseId,
        lessonId: lesson.id,
        type: "lesson_content",
        prompt: topic,
        output: content,
        tokensUsed: Math.ceil(content.length / 4), // Approximate token count
      },
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error("Error generating lesson:", error)
    return NextResponse.json({ error: "Failed to generate lesson" }, { status: 500 })
  }
}
