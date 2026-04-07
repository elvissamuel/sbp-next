"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"
import { getLesson, getCourseBySlug, type Lesson, type Quiz } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"
import { toast } from "sonner"
import { TextToSpeech } from "@/components/text-to-speech"
import { SlideViewer } from "@/components/lesson/slide-viewer"
import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ENABLE_SLIDES } from "@/lib/slide-presentation"

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

  const hasSlides =
    ENABLE_SLIDES && !!(lesson?.slides && lesson.slides.slides && lesson.slides.slides.length > 0)
  const hasVideo = !!lesson?.videoUrl
  const hasText = !!lesson?.content

  type ViewMode = "speech" | "slide" | "video"

  const defaultMode: ViewMode = useMemo(() => {
    if (hasSlides) return "slide"
    if (hasVideo) return "video"
    return "speech"
  }, [hasSlides, hasVideo])

  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode)

  const [isReflectionOpen, setIsReflectionOpen] = useState(false)
  const [reflectionAnswer, setReflectionAnswer] = useState("")

  useEffect(() => {
    setViewMode(defaultMode)
  }, [defaultMode, lessonId])

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

    const question = (lesson?.reflectionQuestion || "").trim()
    if (question) {
      setIsReflectionOpen(true)
      return
    }

    markCompleteMutation.mutate()
  }

  const handleSubmitReflection = () => {
    if (!reflectionAnswer.trim()) {
      toast.error("Please provide an answer before continuing")
      return
    }

    setIsReflectionOpen(false)
    setReflectionAnswer("")
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
      <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Dialog open={isReflectionOpen} onOpenChange={setIsReflectionOpen}>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Quick Question</DialogTitle>
                  <DialogDescription>
                    Answer the question below to continue to the next lesson.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {lesson.reflectionQuestion}
                  </div>
                  <Textarea
                    value={reflectionAnswer}
                    onChange={(e) => setReflectionAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    rows={4}
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReflectionOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitReflection} disabled={markCompleteMutation.isPending}>
                    Continue
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="flex items-center justify-center">
              <div
                className={`w-full max-w-2xl grid bg-[#EFEFEF] rounded-sm overflow-hidden ${
                  ENABLE_SLIDES ? "grid-cols-3" : "grid-cols-2"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("speech")}
                  disabled={!hasText}
                  className={`h-10 text-sm transition ${
                    viewMode === "speech" ? "bg-[#0F766E] text-white" : "text-muted-foreground"
                  } ${!hasText ? "opacity-50 cursor-not-allowed" : "hover:text-foreground"}`}
                >
                  Speech to text
                </button>
                {ENABLE_SLIDES && (
                  <button
                    type="button"
                    onClick={() => setViewMode("slide")}
                    disabled={!hasSlides}
                    className={`h-10 text-sm transition ${
                      viewMode === "slide" ? "bg-[#0F766E] text-white" : "text-muted-foreground"
                    } ${!hasSlides ? "opacity-50 cursor-not-allowed" : "hover:text-foreground"}`}
                  >
                    Slide
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewMode("video")}
                  disabled={!hasVideo}
                  className={`h-10 text-sm transition ${
                    viewMode === "video" ? "bg-[#0F766E] text-white" : "text-muted-foreground"
                  } ${!hasVideo ? "opacity-50 cursor-not-allowed" : "hover:text-foreground"}`}
                >
                  video
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href={`/classroom/course/${slug}`} className="inline-flex items-center hover:text-foreground">
                <ChevronLeft size={16} className="mr-1" />
                Back To Courses
              </Link>
            </div>

            <div className="border border-[#CFF3E7] bg-white rounded-sm px-6 py-4">
              <p className="text-xs text-muted-foreground">
                {lessonOnlyIndex >= 0 ? lessonOnlyIndex + 1 : "?"} of {lessons.length} lessons
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-[#D9D9D9] overflow-hidden">
                <div
                  className="h-full bg-[#62C2A3]"
                  style={{
                    width:
                      lessons.length > 0 && lessonOnlyIndex >= 0
                        ? `${Math.round(((lessonOnlyIndex + 1) / lessons.length) * 100)}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-[#111827] leading-tight">{lesson.title}</h1>
            </div>

            {viewMode === "slide" && hasSlides && (
              <div className="space-y-4">
                <SlideViewer slides={lesson.slides!.slides} onComplete={handleMarkComplete} />
              </div>
            )}

            {viewMode === "video" && hasVideo && (
              <div className="rounded-lg overflow-hidden bg-black">
                <div className="aspect-video w-full">
                  <video controls className="w-full h-full" src={lesson.videoUrl!} preload="metadata">
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}

            {viewMode === "speech" && hasText && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <TextToSpeech text={lesson.content || ""} compact />
                </div>
                <div className="bg-white rounded-lg border border-border/40 overflow-hidden">
                  <div className="p-6">
                    <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      {lesson.content?.split("\n").map((line, i) => {
                        if (line.trim()) {
                          return (
                            <p key={i} className="text-sm text-muted-foreground">
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

            <div className="pt-2">
              {!isCurrentLessonCompleted && (
                <div className="flex justify-end">
                  <Button
                    className="h-10 px-10 rounded-md bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                    onClick={handleMarkComplete}
                    disabled={markCompleteMutation.isPending}
                  >
                    {markCompleteMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Marking as Complete...
                      </>
                    ) : (
                      "Next Lesson"
                    )}
                  </Button>
                </div>
              )}

              {isCurrentLessonCompleted && (
                <div className="flex items-center justify-between gap-4">
                  {previousItem ? (
                    <Button
                      asChild
                      className="h-10 px-10 rounded-md bg-[#E5E7EB] hover:bg-[#E5E7EB]/90 text-[#111827]"
                    >
                      <Link
                        href={
                          previousItem.type === "lesson"
                            ? `/classroom/course/${slug}/lesson/${previousItem.id}`
                            : `/classroom/course/${slug}/quiz/${previousItem.id}`
                        }
                      >
                        Previous lesson
                      </Link>
                    </Button>
                  ) : (
                    <div />
                  )}

                  {nextItem ? (
                    <Button asChild className="h-10 px-16 rounded-md bg-[#0F766E] hover:bg-[#0F766E]/90 text-white">
                      <Link
                        href={
                          nextItem.type === "lesson"
                            ? `/classroom/course/${slug}/lesson/${nextItem.id}`
                            : `/classroom/course/${slug}/quiz/${nextItem.id}`
                        }
                      >
                        Next Lesson
                      </Link>
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
