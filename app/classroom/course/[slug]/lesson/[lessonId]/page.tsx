"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2, HelpCircle, FileText, Clock } from "lucide-react"
import { getLesson, getCourseBySlug, type Lesson, type Quiz } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"

export default function ClassroomLessonView() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const slug = params.slug as string
  const lessonId = params.lessonId as string
  const currentUser = getCurrentUser()
  const userId = currentUser?.id

  // Fetch lesson data
  const { data: lessonResponse, isLoading: lessonLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => getLesson(lessonId),
    enabled: !!lessonId,
  })

  // Fetch course data for sidebar
  const { data: courseResponse } = useQuery({
    queryKey: ["course-by-slug", slug, userId],
    queryFn: () => getCourseBySlug(slug, userId),
    enabled: !!slug,
  })

  const lesson = lessonResponse?.data
  const course = courseResponse?.data
  const lessons = course?.lessons || []
  const quizzes = course?.quizzes || []
  const stats = course?.stats || { totalLessons: 0, completedLessons: 0, progress: 0 }
  const enrollment = course?.enrollment

  // Calculate which lessons are completed
  const completedLessonsCount = stats.completedLessons
  const isLessonCompleted = (index: number) => {
    return index < completedLessonsCount
  }

  const isQuizCompleted = (quizId: string) => {
    const quiz = quizzes.find((q: Quiz) => q.id === quizId)
    return !!quiz?.attempts?.[0]?.passed
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

  // Find current item index in sorted array
  const currentItemIndex = allContent.findIndex((item) => item.id === lessonId)
  const currentItem = allContent[currentItemIndex]
  const isCurrentLessonCompleted = currentItem?.type === "lesson" && currentItem.completed
  
  // Find previous and next items in chronological order
  const previousItem = currentItemIndex > 0 ? allContent[currentItemIndex - 1] : null
  const nextItem = currentItemIndex < allContent.length - 1 ? allContent[currentItemIndex + 1] : null

  // Calculate lesson position among lessons only (for display)
  const lessonOnlyIndex = lessons.findIndex((l: Lesson) => l.id === lessonId)

  // Mark lesson as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("User not logged in")
      }
      const baseUrl = process.env.NEXT_PUBLIC_BROWSER_URL || ""
      const response = await fetch(`${baseUrl}/api/lessons/${lessonId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to mark lesson as complete")
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success("Lesson marked as complete!")
      queryClient.invalidateQueries({ queryKey: ["course-by-slug", slug, userId] })
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] })
      // Navigate to next item if available
      if (nextItem) {
        if (nextItem.type === "lesson") {
          router.push(`/classroom/course/${slug}/lesson/${nextItem.id}`)
        } else {
          router.push(`/classroom/course/${slug}/quiz/${nextItem.id}`)
        }
      }
    },
    onError: (error: any) => {
      toast.error("Failed to mark lesson as complete", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const handleMarkComplete = () => {
    if (!userId) {
      toast.error("Please log in to mark lessons as complete")
      return
    }
    markCompleteMutation.mutate()
  }

  if (lessonLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-destructive">Lesson not found.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href={`/classroom/course/${slug}`}>Back to Course</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="grid md:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="md:col-span-3 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Lesson {lessonOnlyIndex >= 0 ? lessonOnlyIndex + 1 : "?"} of {lessons.length}
              </p>
              <h1 className="text-3xl font-bold text-foreground">{lesson.title}</h1>
            </div>
            {isCurrentLessonCompleted && <CheckCircle2 size={24} className="text-green-600" />}
          </div>

          {/* Video Player */}
          {lesson.videoUrl && (
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                  <video
                    controls
                    className="w-full h-full"
                    src={lesson.videoUrl}
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {lesson.content.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) {
                    return (
                      <h2 key={i} className="text-2xl font-bold mt-6 mb-4 text-foreground">
                        {line.replace("# ", "")}
                      </h2>
                    )
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <h3 key={i} className="text-xl font-semibold mt-4 mb-2 text-foreground">
                        {line.replace("## ", "")}
                      </h3>
                    )
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <h4 key={i} className="text-lg font-semibold mt-3 mb-2 text-foreground">
                        {line.replace("### ", "")}
                      </h4>
                    )
                  }
                  if (line.startsWith("- ") || line.startsWith("* ")) {
                    return (
                      <li key={i} className="ml-4 text-muted-foreground list-disc">
                        {line.replace(/^[-*] /, "")}
                      </li>
                    )
                  }
                  if (line.trim().startsWith("```")) {
                    return <br key={i} />
                  }
                  if (line.trim()) {
                    return (
                      <p key={i} className="text-muted-foreground mb-3 leading-relaxed">
                        {line}
                      </p>
                    )
                  }
                  return <br key={i} />
                })}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-3">
            {previousItem ? (
              <Button variant="outline" asChild>
                <Link href={
                  previousItem.type === "lesson"
                    ? `/classroom/course/${slug}/lesson/${previousItem.id}`
                    : `/classroom/course/${slug}/quiz/${previousItem.id}`
                }>
                  <ChevronLeft size={16} className="mr-2" />
                  Previous {previousItem.type === "lesson" ? "Lesson" : "Quiz"}
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <ChevronLeft size={16} className="mr-2" />
                Previous
              </Button>
            )}
            {!isCurrentLessonCompleted && (
              <Button
                className="flex-1"
                onClick={handleMarkComplete}
                disabled={markCompleteMutation.isPending}
              >
                {markCompleteMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  "Mark as Complete"
                )}
              </Button>
            )}
            {nextItem ? (
              isCurrentLessonCompleted ? (
                <Button variant="default" asChild>
                  <Link href={
                    nextItem.type === "lesson"
                      ? `/classroom/course/${slug}/lesson/${nextItem.id}`
                      : `/classroom/course/${slug}/quiz/${nextItem.id}`
                  }>
                    Next {nextItem.type === "lesson" ? "Lesson" : "Quiz"}
                    <ChevronRight size={16} className="ml-2" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  Next {nextItem.type === "lesson" ? "Lesson" : "Quiz"}
                  <ChevronRight size={16} className="ml-2" />
                </Button>
              )
            ) : (
              <Button variant={isCurrentLessonCompleted ? "default" : "outline"} disabled>
                Next
                <ChevronRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar - Course Contents */}
        <div>
          <Card className="border-border/50 sticky top-20">
            <CardHeader>
              <div>
                <CardTitle className="text-lg">{course?.title || "Course"}</CardTitle>
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
                {allContent.map((item, idx) => {
                  const isLocked = idx > maxAccessibleIndex
                  if (item.type === "lesson") {
                    // Find the original lesson index for completion status
                    const lessonIndex = lessons.findIndex((l: Lesson) => l.id === item.id)
                    const isCompleted = lessonIndex >= 0 ? isLessonCompleted(lessonIndex) : false
                    const lesson = lessons.find((l: Lesson) => l.id === item.id)
                    const isActive = item.id === lessonId
                    
                    const content = (
                      <div
                        className={`flex items-start gap-3 p-2 rounded-md transition group ${
                          isActive
                            ? "bg-accent border border-primary/20"
                            : isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 size={18} className="text-green-600" />
                          ) : (
                            <Circle size={18} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium transition line-clamp-2 ${
                            isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                          }`}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">Lesson {lesson?.order !== undefined ? lesson.order + 1 : ''}</p>
                            {item.duration && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <div className="flex items-center gap-1">
                                  <Clock size={10} />
                                  <p className="text-xs text-muted-foreground">{item.duration} min</p>
                                </div>
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
                    const isActive = item.id === lessonId
                    const content = (
                      <div
                        className={`flex items-start gap-3 p-2 rounded-md transition group ${
                          isActive
                            ? "bg-accent border border-primary/20"
                            : isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <HelpCircle size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium transition line-clamp-2 ${
                            isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                          }`}>
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
