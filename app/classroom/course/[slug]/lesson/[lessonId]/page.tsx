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
import { TextToSpeech } from "@/components/text-to-speech"
import { SlideViewer } from "@/components/lesson/slide-viewer"

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
        <div className="flex items-center justify-center min-h-[400px] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#65B32E]" />
        </div>
      </DashboardLayout>
    )
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <Card className="border-[#DE1915]/20 bg-white">
          <CardContent className="pt-6">
            <p className="text-[#DE1915]">Lesson not found.</p>
            <Button variant="outline" asChild className="mt-4 border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10">
              <Link href={`/classroom/course/${slug}`}>Back to Course</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#65B32E]/20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground hover:text-[#65B32E]"
                >
                  <Link href={`/classroom/course/${slug}`}>
                    <ChevronLeft size={18} className="mr-1" />
                    Back to Course
                  </Link>
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Lesson {lessonOnlyIndex >= 0 ? lessonOnlyIndex + 1 : "?"} of {lessons.length}
                  </span>
                  {isCurrentLessonCompleted && (
                    <CheckCircle2 size={16} className="text-[#65B32E]" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {previousItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-muted-foreground hover:text-[#65B32E]"
                  >
                    <Link href={
                      previousItem.type === "lesson"
                        ? `/classroom/course/${slug}/lesson/${previousItem.id}`
                        : `/classroom/course/${slug}/quiz/${previousItem.id}`
                    }>
                      <ChevronLeft size={18} />
                    </Link>
                  </Button>
                )}
                {nextItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-muted-foreground hover:text-[#65B32E]"
                    disabled={!isCurrentLessonCompleted}
                  >
                    <Link href={
                      nextItem.type === "lesson"
                        ? `/classroom/course/${slug}/lesson/${nextItem.id}`
                        : `/classroom/course/${slug}/quiz/${nextItem.id}`
                    }>
                      <ChevronRight size={18} />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Content - Modern Presentation Style */}
            <div className="lg:col-span-8 space-y-6">
              {/* Lesson Title */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  {lesson.title}
                </h1>
              </div>

              {/* Video Player */}
              {lesson.videoUrl && (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border-2 border-[#65B32E]/30">
                  <div className="aspect-video w-full">
                    <video
                      controls
                      className="w-full h-full"
                      src={lesson.videoUrl}
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              )}

              {/* Slide-based Lesson */}
              {lesson.slides && lesson.slides.slides && lesson.slides.slides.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-xl border-2 border-[#65B32E]/20 overflow-visible p-1">
                  <SlideViewer
                    slides={lesson.slides.slides}
                    onComplete={handleMarkComplete}
                  />
                </div>
              ) : (
                /* Text-based Lesson - Modern Card Design */
                <div className="bg-white rounded-2xl shadow-xl border-2 border-[#65B32E]/20 overflow-hidden">
                  <div className="p-8 md:p-12">
                    {/* Text to Speech Controls */}
                    <div className="flex justify-end mb-6">
                      <TextToSpeech text={lesson.content || ""} compact />
                    </div>
                    
                    {/* Content with modern typography */}
                    <div className="prose prose-lg max-w-none">
                      <div className="space-y-6 text-gray-700 leading-relaxed">
                        {lesson.content?.split("\n").map((line, i) => {
                          if (line.startsWith("# ")) {
                            return (
                              <h2 key={i} className="text-3xl font-bold mt-8 mb-4 text-[#65B32E] first:mt-0">
                                {line.replace("# ", "")}
                              </h2>
                            )
                          }
                          if (line.startsWith("## ")) {
                            return (
                              <h3 key={i} className="text-2xl font-semibold mt-6 mb-3 text-[#65B32E]">
                                {line.replace("## ", "")}
                              </h3>
                            )
                          }
                          if (line.startsWith("### ")) {
                            return (
                              <h4 key={i} className="text-xl font-semibold mt-4 mb-2 text-[#65B32E]">
                                {line.replace("### ", "")}
                              </h4>
                            )
                          }
                          if (line.startsWith("- ") || line.startsWith("* ")) {
                            return (
                              <li key={i} className="ml-6 text-gray-700 list-disc text-lg">
                                {line.replace(/^[-*] /, "")}
                              </li>
                            )
                          }
                          if (line.trim().startsWith("```")) {
                            return <br key={i} />
                          }
                          if (line.trim()) {
                            return (
                              <p key={i} className="text-lg text-gray-700 mb-4 leading-relaxed">
                                {line}
                              </p>
                            )
                          }
                          return <br key={i} />
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                {!isCurrentLessonCompleted && (
                  <Button
                    size="lg"
                    className="flex-1 bg-[#65B32E] hover:bg-[#65B32E]/90 text-white shadow-lg hover:shadow-xl transition-all"
                    onClick={handleMarkComplete}
                    disabled={markCompleteMutation.isPending}
                  >
                    {markCompleteMutation.isPending ? (
                      <>
                        <Loader2 size={20} className="mr-2 animate-spin" />
                        Marking as Complete...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} className="mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                )}
                {isCurrentLessonCompleted && nextItem && (
                  <Button
                    size="lg"
                    asChild
                    className="flex-1 bg-[#65B32E] hover:bg-[#65B32E]/90 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Link href={
                      nextItem.type === "lesson"
                        ? `/classroom/course/${slug}/lesson/${nextItem.id}`
                        : `/classroom/course/${slug}/quiz/${nextItem.id}`
                    }>
                      Continue to {nextItem.type === "lesson" ? "Next Lesson" : "Quiz"}
                      <ChevronRight size={20} className="ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar - Modern Course Contents */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                {/* Course Info Card */}
                <Card className="border-2 border-[#65B32E]/20 bg-white shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-[#65B32E]">
                      {course?.title || "Course"}
                    </CardTitle>
                    {enrollment && (
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium">Progress</span>
                          <span className="font-bold text-[#65B32E] text-lg">{stats.progress}%</span>
                        </div>
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className="h-full bg-gradient-to-r from-[#65B32E] to-[#65B32E]/80 transition-all duration-500 rounded-full"
                            style={{ width: `${stats.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stats.completedLessons} of {stats.totalLessons} lessons completed
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
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
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all group ${
                          isActive
                            ? "bg-gradient-to-r from-[#65B32E]/10 to-[#65B32E]/5 border-2 border-[#65B32E] shadow-md"
                            : isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[#65B32E]/5 hover:border hover:border-[#65B32E]/20 border border-transparent"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 size={20} className="text-[#65B32E]" />
                          ) : (
                            <Circle size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold transition line-clamp-2 ${
                            isActive ? "text-[#65B32E]" : "text-gray-700 group-hover:text-[#65B32E]"
                          }`}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-medium text-gray-500">
                              Lesson {lesson?.order !== undefined ? lesson.order + 1 : ''}
                            </span>
                            {item.duration && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <div className="flex items-center gap-1">
                                  <Clock size={12} className="text-gray-400" />
                                  <span className="text-xs text-gray-500">{item.duration} min</span>
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
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all group ${
                          isActive
                            ? "bg-gradient-to-r from-[#65B32E]/10 to-[#65B32E]/5 border-2 border-[#65B32E] shadow-md"
                            : isLocked
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[#65B32E]/5 hover:border hover:border-[#65B32E]/20 border border-transparent"
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <HelpCircle size={20} className="text-[#65B32E]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold transition line-clamp-2 ${
                            isActive ? "text-[#65B32E]" : "text-gray-700 group-hover:text-[#65B32E]"
                          }`}>
                            {item.title}
                          </p>
                          <p className="text-xs font-medium text-gray-500 mt-1.5">Quiz</p>
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
        </div>
      </div>
    </DashboardLayout>
  )
}
