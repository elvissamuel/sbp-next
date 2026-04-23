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
  const courseLoadError = courseResponse?.error as any
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

  const isQuizCompleted = (quizId: string) => {
    const quiz = quizzes.find((q: Quiz) => q.id === quizId)
    const attemptsCount = quiz?.attempts?.length || 0
    return !!quiz?.attempts?.[0]?.passed || attemptsCount >= 2
  }

  // Combine lessons and quizzes, sorted by creation date chronologically
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
      order: null,
      completed: isQuizCompleted(quiz.id),
      duration: null,
      createdAt: quiz.createdAt,
    })),
  ].sort((a, b) => {
    // Sort by creation date chronologically (oldest first)
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateA - dateB
  })

  // Lock progression: users can only access items up to the first incomplete item
  const firstIncompleteIndex = allContent.findIndex((item) => !item.completed)
  const maxAccessibleIndex = firstIncompleteIndex === -1 ? allContent.length - 1 : firstIncompleteIndex

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
        <div className="flex items-center justify-center min-h-[400px] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#65B32E]" />
        </div>
      </DashboardLayout>
    )
  }

  if (courseLoadError?.message?.toLowerCase?.().includes("deadline") || courseLoadError?.message?.toLowerCase?.().includes("expired")) {
    return (
      <DashboardLayout>
        <Card className="border-[#DE1915]/20 bg-white">
          <CardContent className="pt-6">
            <p className="text-[#DE1915]">This course has expired and can no longer be taken.</p>
            <Button variant="outline" asChild className="mt-4 border-[#01402E]/30 text-[#01402E] hover:bg-[#01402E]/10">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  if (error || !course) {
    return (
      <DashboardLayout>
        <Card className="border-[#DE1915]/20 bg-white">
          <CardContent className="pt-6">
            <p className="text-[#DE1915]">Course not found or failed to load.</p>
            <Button variant="outline" asChild className="mt-4 border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10">
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
    <div className="text-center py-12 bg-white">
      <p className="text-muted-foreground mb-4">Select a lesson from the sidebar to get started</p>
      <Button asChild className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white">
        <Link href={`/classroom/course/${slug}/lesson/${firstLesson.id}`}>
          <PlayCircle size={18} className="mr-2" />
          Start First Lesson
        </Link>
      </Button>
    </div>
  ) : (
    <div className="text-center py-12 bg-white">
      <p className="text-muted-foreground">No lessons available yet.</p>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="grid md:grid-cols-4 gap-6">
        {/* Main Content Area - Will show lesson content when lesson is selected */}
        <div className="md:col-span-3">
          {defaultContent}
        </div>

        {/* Sidebar - Lessons and Quizzes */}
        <div>
          <Card className="border-[#65B32E]/20 bg-white sticky top-20">
            <CardHeader>
              <div>
                <CardTitle className="text-lg text-[#65B32E]">{course.title}</CardTitle>
                {enrollment && (
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-[#65B32E]">{stats.progress}%</span>
                    </div>
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#65B32E]/20">
                      <div 
                        className="h-full bg-[#65B32E] transition-all"
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.completedLessons} of {stats.totalLessons} lessons
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                {allContent.map((item, idx) => {
                  const isLocked = idx > maxAccessibleIndex
                  if (item.type === "lesson") {
                    // Find the original lesson index for completion status
                    const lessonIndex = lessons.findIndex((l: Lesson) => l.id === item.id)
                    const isCompleted = lessonIndex >= 0 ? isLessonCompleted(lessonIndex) : false
                    const lesson = lessons.find((l: Lesson) => l.id === item.id)
                    
                    const content = (
                      <div
                        className={`flex items-start gap-3 p-2 rounded-md transition group ${
                          isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-[#65B32E]/10"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 size={18} className="text-[#65B32E]" />
                          ) : (
                            <Circle size={18} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#65B32E] group-hover:text-[#65B32E]/80 transition line-clamp-2">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">Lesson {lesson?.order !== undefined ? lesson.order + 1 : ''}</p>
                            {item.duration && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <p className="text-xs text-muted-foreground">{item.duration} min</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )

                    if (isLocked) {
                      return <div key={item.id}>{content}</div>
                    }

                    return (
                      <Link
                        key={item.id}
                        href={`/classroom/course/${slug}/lesson/${item.id}`}
                        className="block"
                      >
                        {content}
                      </Link>
                    )
                  } else {
                    // Quiz item
                    const content = (
                      <div
                        className={`flex items-start gap-3 p-2 rounded-md transition group ${
                          isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-[#65B32E]/10"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <HelpCircle size={18} className="text-[#65B32E]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#65B32E] group-hover:text-[#65B32E]/80 transition line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Quiz</p>
                        </div>
                      </div>
                    )

                    if (isLocked) {
                      return <div key={item.id}>{content}</div>
                    }

                    return (
                      <Link
                        key={item.id}
                        href={`/classroom/course/${slug}/quiz/${item.id}`}
                        className="block"
                      >
                        {content}
                      </Link>
                    )
                  }
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
