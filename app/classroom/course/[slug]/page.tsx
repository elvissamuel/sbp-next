"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Loader2, HelpCircle, FileText, PlayCircle, Clock } from "lucide-react"
import { getCourseBySlug, type Lesson, type Quiz } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"
import { AppBreadcrumbs } from "@/components/breadcrumbs"

export default function ClassroomCourseView() {
  const params = useParams()
  const slug = params.slug as string
  const currentUser = getCurrentUser()
  const userId = currentUser?.id

  // Fetch course data by slug
  const { data: courseResponse, isLoading, error } = useQuery({
    queryKey: ["course-by-slug", slug, userId],
    queryFn: () => getCourseBySlug(slug, userId),
    enabled: !!slug,
  })

  const course = courseResponse?.data
  const lessons = course?.lessons || []
  const quizzes = course?.quizzes || []
  const stats = course?.stats || { totalLessons: 0, completedLessons: 0, progress: 0 }
  const enrollment = course?.enrollment

  // Calculate which lessons are completed based on progress
  // If user has completed X% of the course, lessons up to X% of the total are marked as completed
  const completedLessonsCount = stats.completedLessons
  const isLessonCompleted = (index: number) => {
    return index < completedLessonsCount
  }

  // Combine lessons and quizzes, sorted by order/created date
  const allContent = [
    ...lessons.map((lesson: Lesson, index: number) => ({
      id: lesson.id,
      type: "lesson" as const,
      title: lesson.title,
      order: lesson.order,
      completed: isLessonCompleted(index),
      duration: lesson.duration,
      createdAt: lesson.createdAt,
    })),
    ...quizzes.map((quiz: Quiz) => ({
      id: quiz.id,
      type: "quiz" as const,
      title: quiz.title,
      order: 9999, // Quizzes at the end
      completed: false, // Quiz completion tracked separately
      duration: null,
      createdAt: quiz.createdAt,
    })),
  ].sort((a, b) => {
    // Lessons come first, sorted by order
    if (a.type === "lesson" && b.type === "lesson") {
      return a.order - b.order
    }
    // Then quizzes, sorted by creation date
    if (a.type === "quiz" && b.type === "quiz") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    // Lessons always before quizzes
    return a.type === "lesson" ? -1 : 1
  })

  // Find the first incomplete lesson/quiz for "Start Learning" or "Continue Learning"
  const firstIncomplete = allContent.find((item) => !item.completed)
  const startLink = firstIncomplete
    ? firstIncomplete.type === "lesson"
      ? `/classroom/course/${slug}/lesson/${firstIncomplete.id}`
      : `/classroom/course/${slug}/quiz/${firstIncomplete.id}`
    : `/classroom/course/${slug}/lesson/${lessons[0]?.id || ""}`

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !course) {
    return (
      <DashboardLayout>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-destructive">Course not found or failed to load.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // If no lesson is selected, show first lesson or empty state
  const firstLesson = lessons[0]
  const defaultContent = firstLesson ? (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">Select a lesson from the sidebar to get started</p>
      <Button asChild>
        <Link href={`/classroom/course/${slug}/lesson/${firstLesson.id}`}>
          <PlayCircle size={18} className="mr-2" />
          Start First Lesson
        </Link>
      </Button>
    </div>
  ) : (
    <div className="text-center py-12">
      <p className="text-muted-foreground">No lessons available yet.</p>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="grid md:grid-cols-4 gap-6">
        {/* Main Content Area - Will show lesson content when lesson is selected */}
        <div className="md:col-span-3">
          {defaultContent}
        </div>

        {/* Sidebar - Lessons and Quizzes */}
        <div>
          <Card className="border-border/50 sticky top-20">
            <CardHeader>
              <div>
                <CardTitle className="text-lg">{course.title}</CardTitle>
                {enrollment && (
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{stats.progress}%</span>
                    </div>
                    <Progress value={stats.progress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {stats.completedLessons} of {stats.totalLessons} lessons
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                {lessons.map((lesson: Lesson, index: number) => {
                  const isCompleted = isLessonCompleted(index)
                  return (
                    <Link
                      key={lesson.id}
                      href={`/classroom/course/${slug}/lesson/${lesson.id}`}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-accent transition group"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 size={18} className="text-green-600" />
                        ) : (
                          <Circle size={18} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition line-clamp-2">
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">Lesson {lesson.order + 1}</p>
                          {lesson.duration && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">{lesson.duration} min</p>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {quizzes.map((quiz: Quiz) => (
                  <Link
                    key={quiz.id}
                    href={`/classroom/course/${slug}/quiz/${quiz.id}`}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-accent transition group"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <HelpCircle size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition line-clamp-2">
                        {quiz.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Quiz</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
