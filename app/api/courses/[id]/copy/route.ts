import { prisma } from "@/lib/db"
import { generateSlug } from "@/lib/utils"
import { type NextRequest, NextResponse } from "next/server"

// Copy a course from system organization to an organization
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const sourceCourseId = resolvedParams.id

    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Verify organization exists
    const targetOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!targetOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Find the source course with all its relations
    const sourceCourse = await prisma.course.findUnique({
      where: { id: sourceCourseId },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        resources: true,
      },
    })

    if (!sourceCourse) {
      return NextResponse.json({ error: "Source course not found" }, { status: 404 })
    }

    // Check if course already exists in target organization (by title)
    const existingCourse = await prisma.course.findFirst({
      where: {
        organizationId,
        title: sourceCourse.title,
      },
    })

    if (existingCourse) {
      return NextResponse.json(
        { error: "A course with this title already exists in your organization" },
        { status: 400 }
      )
    }

    // Generate a unique slug for the new course
    let newSlug = generateSlug(sourceCourse.title)
    let slugExists = await prisma.course.findUnique({
      where: { slug: newSlug },
    })

    // If slug exists, append a random string
    if (slugExists) {
      newSlug = `${newSlug}-${Date.now()}`
    }

    // Create the new course
    const newCourse = await prisma.course.create({
      data: {
        organizationId,
        title: sourceCourse.title,
        description: sourceCourse.description,
        slug: newSlug,
        thumbnail: sourceCourse.thumbnail,
        status: "draft", // Start as draft so admin can review
        level: sourceCourse.level,
        price: sourceCourse.price,
        currency: sourceCourse.currency,
      },
    })

    // Copy lessons
    for (const lesson of sourceCourse.lessons) {
      await prisma.lesson.create({
        data: {
          courseId: newCourse.id,
          title: lesson.title,
          content: lesson.content,
          videoUrl: lesson.videoUrl,
          order: lesson.order,
          duration: lesson.duration,
        },
      })
    }

    // Copy quizzes with questions
    for (const quiz of sourceCourse.quizzes) {
      const newQuiz = await prisma.quiz.create({
        data: {
          courseId: newCourse.id,
          title: quiz.title,
          description: quiz.description,
          passingScore: quiz.passingScore,
          totalPoints: quiz.totalPoints,
        },
      })

      // Copy quiz questions
      for (const question of quiz.questions) {
        await prisma.quizQuestion.create({
          data: {
            quizId: newQuiz.id,
            question: question.question,
            type: question.type,
            options: question.options,
            correctAnswer: question.correctAnswer,
            points: question.points,
            order: question.order,
          },
        })
      }
    }

    // Copy course resources
    for (const resource of sourceCourse.resources) {
      await prisma.courseResource.create({
        data: {
          courseId: newCourse.id,
          title: resource.title,
          type: resource.type,
          url: resource.url,
          content: resource.content,
        },
      })
    }

    // Fetch the complete new course with relations
    const createdCourse = await prisma.course.findUnique({
      where: { id: newCourse.id },
      include: {
        lessons: {
          orderBy: { order: "asc" },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { order: "asc" },
            },
          },
        },
        resources: true,
      },
    })

    return NextResponse.json(createdCourse, { status: 201 })
  } catch (error) {
    console.error("Error copying course:", error)
    return NextResponse.json({ error: "Failed to copy course" }, { status: 500 })
  }
}

