"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  HelpCircle,
  FileText,
  Clock,
  Trophy,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react"
import { getQuiz, getCourseBySlug, submitQuiz, type Lesson, type Quiz, type QuizQuestion } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

// Kahoot-style colors for options
const OPTION_COLORS = [
  { bg: "bg-blue-600", hover: "hover:bg-blue-700", border: "border-blue-500", light: "bg-blue-50", text: "text-blue-600" },
  { bg: "bg-red-600", hover: "hover:bg-red-700", border: "border-red-500", light: "bg-red-50", text: "text-red-600" },
  { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", border: "border-yellow-400", light: "bg-yellow-50", text: "text-yellow-600" },
  { bg: "bg-green-600", hover: "hover:bg-green-700", border: "border-green-500", light: "bg-green-50", text: "text-green-600" },
]

export default function ClassroomQuizView() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const slug = params.slug as string
  const quizId = params.quizId as string
  const currentUser = getCurrentUser()
  const userId = currentUser?.id

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [quizResult, setQuizResult] = useState<{ score: number; totalPoints: number; passed: boolean } | null>(null)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [hasStartedAudio, setHasStartedAudio] = useState(false)

  const ambienceRef = useRef<HTMLAudioElement | null>(null)
  const winRef = useRef<HTMLAudioElement | null>(null)
  const failRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Initialize audio elements once on mount
    const ambience = new Audio("/sound/quiz-ambience.mp3")
    ambience.loop = true
    ambience.volume = 0.35

    const winner = new Audio("/sound/winner-sound.mp3")
    winner.volume = 0.7

    const failure = new Audio("/sound/buzzer-failure.mp3")
    failure.volume = 0.7

    ambienceRef.current = ambience
    winRef.current = winner
    failRef.current = failure

    return () => {
      ambience.pause()
      winner.pause()
      failure.pause()
    }
  }, [])

  const startBackgroundSound = () => {
    if (!isSoundEnabled || hasStartedAudio) return
    const ambience = ambienceRef.current
    if (!ambience) return
    ambience.currentTime = 0
    ambience
      .play()
      .then(() => {
        setHasStartedAudio(true)
      })
      .catch(() => {
        // Autoplay blocked; user can toggle sound manually
      })
  }

  const stopBackgroundSound = () => {
    const ambience = ambienceRef.current
    if (!ambience) return
    ambience.pause()
    ambience.currentTime = 0
    setHasStartedAudio(false)
  }

  const playResultSound = (passed: boolean) => {
    if (!isSoundEnabled) return
    const audio = passed ? winRef.current : failRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {
      // Ignore playback errors
    })
  }

  const toggleSound = () => {
    const next = !isSoundEnabled
    setIsSoundEnabled(next)

    const ambience = ambienceRef.current
    const winner = winRef.current
    const failure = failRef.current

    const all = [ambience, winner, failure].filter(Boolean) as HTMLAudioElement[]

    all.forEach((audio) => {
      audio.muted = !next
    })

    if (!next) {
      // Turning sound off should stop the background ambience
      if (ambience) {
        ambience.pause()
      }
      setHasStartedAudio(false)
    }
  }

  // Fetch quiz data
  const { data: quizResponse, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuiz(quizId),
    enabled: !!quizId,
  })

  // Fetch course data for sidebar
  const { data: courseResponse } = useQuery({
    queryKey: ["course-by-slug", slug, userId],
    queryFn: () => getCourseBySlug(slug, userId),
    enabled: !!slug,
  })

  const quiz = quizResponse?.data
  const course = courseResponse?.data
  const lessons = course?.lessons || []
  const quizzes = course?.quizzes || []
  const stats = course?.stats || { totalLessons: 0, completedLessons: 0, progress: 0 }
  const enrollment = course?.enrollment

  const questions = quiz?.questions || []
  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = questions.length

  // Automatically start ambience when arriving on the quiz (e.g. from a lesson),
  // as long as sound is enabled and results aren't being shown yet.
  useEffect(() => {
    if (!showResults && totalQuestions > 0 && isSoundEnabled) {
      startBackgroundSound()
    }
  }, [showResults, totalQuestions, isSoundEnabled])

  // Calculate which lessons are completed
  const completedLessonsCount = stats.completedLessons
  const isLessonCompleted = (index: number) => {
    return index < completedLessonsCount
  }

  const isQuizCompleted = (quizId: string) => {
    const q = quizzes.find((qz: Quiz) => qz.id === quizId)
    return !!q?.attempts?.[0]?.passed
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

  // Find current item index in sorted array
  const currentItemIndex = allContent.findIndex((item) => item.id === quizId)
  const nextItem = currentItemIndex < allContent.length - 1 ? allContent[currentItemIndex + 1] : null

  // Lock progression: users can only access items up to the first incomplete item
  const firstIncompleteIndex = allContent.findIndex((item) => !item.completed)
  const maxAccessibleIndex = firstIncompleteIndex === -1 ? allContent.length - 1 : firstIncompleteIndex

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: (answers: Record<string, string>) => {
      if (!userId) throw new Error("User not logged in")
      return submitQuiz(userId, quizId, answers)
    },
    onSuccess: (response) => {
      if (response.data) {
        stopBackgroundSound()
        playResultSound(response.data.passed)

        setQuizResult({
          score: response.data.score,
          totalPoints: response.data.totalPoints,
          passed: response.data.passed,
        })
        setShowResults(true)
        queryClient.invalidateQueries({ queryKey: ["course-by-slug", slug, userId] })
        
        if (response.data.passed) {
          toast.success("Quiz passed!", {
            description: `You scored ${response.data.score}/${response.data.totalPoints} points.`,
          })
        } else {
          toast.error("Quiz not passed", {
            description: `You scored ${response.data.score}/${response.data.totalPoints} points. You need ${quiz?.passingScore || 70}% to pass.`,
          })
        }
      }
    },
    onError: (error: any) => {
      toast.error("Failed to submit quiz", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const handleAnswerSelect = (questionId: string, answer: string) => {
    if (!hasStartedAudio) {
      startBackgroundSound()
    }
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = () => {
    if (!userId) {
      toast.error("Please log in to submit quiz")
      return
    }

    // Check if all questions are answered
    if (Object.keys(selectedAnswers).length < totalQuestions) {
      toast.error("Please answer all questions before submitting")
      return
    }

    submitQuizMutation.mutate(selectedAnswers)
  }

  // Parse options from JSON string
  const getOptions = (question: QuizQuestion): string[] => {
    try {
      if (typeof question.options === "string") {
        return JSON.parse(question.options)
      }
      return question.options as any as string[]
    } catch {
      return []
    }
  }

  if (quizLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#01402E]" />
        </div>
      </DashboardLayout>
    )
  }

  if (!quiz) {
    return (
      <DashboardLayout>
        <Card className="border-[#DE1915]/20 bg-white">
          <CardContent className="pt-6">
            <p className="text-[#DE1915]">Quiz not found.</p>
            <Button variant="outline" asChild className="mt-4 border-[#01402E]/30 text-[#01402E] hover:bg-[#01402E]/10">
              <Link href={`/classroom/course/${slug}`}>Back to Course</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  // Results view
  if (showResults && quizResult) {
    const percentage = Math.round((quizResult.score / quizResult.totalPoints) * 100)
    const isPassed = quizResult.passed

    return (
      <DashboardLayout>
        <div className="space-y-6 bg-white">
          <AppBreadcrumbs />
          <div>
            {/* Main Content */}
            <div>
              <Card className="border-[#01402E]/20 bg-white">
                <CardContent className="pt-12 pb-12">
                  <div className="max-w-2xl mx-auto text-center space-y-6">
                    <div className={cn(
                      "w-24 h-24 rounded-full mx-auto flex items-center justify-center",
                      isPassed ? "bg-[#01402E]/20" : "bg-[#DE1915]/20"
                    )}>
                      {isPassed ? (
                        <Trophy className="w-12 h-12 text-[#01402E]" />
                      ) : (
                        <AlertCircle className="w-12 h-12 text-[#DE1915]" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-[#01402E] mb-2">
                        {isPassed ? "Congratulations!" : "Try Again!"}
                      </h1>
                      <p className="text-xl text-muted-foreground">
                        You scored {quizResult.score} out of {quizResult.totalPoints} points
                      </p>
                      <p className="text-2xl font-bold mt-4" style={{ color: isPassed ? "#01402E" : "#DE1915" }}>
                        {percentage}%
                      </p>
                    </div>
                    {quiz.description && (
                      <p className="text-muted-foreground">{quiz.description}</p>
                    )}
                    <div className="flex gap-3 justify-center pt-4">
                      {isPassed && nextItem ? (
                        <Button asChild size="lg" className="bg-[#01402E] hover:bg-[#01402E]/90 text-white">
                          <Link href={
                            nextItem.type === "lesson"
                              ? `/classroom/course/${slug}/lesson/${nextItem.id}`
                              : `/classroom/course/${slug}/quiz/${nextItem.id}`
                          }>
                            Next {nextItem.type === "lesson" ? "Lesson" : "Quiz"}
                            <ChevronRight size={18} className="ml-2" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="lg" variant="outline" className="border-[#01402E]/30 text-[#01402E] hover:bg-[#01402E]/10">
                          <Link href={`/classroom/course/${slug}`}>Back to Course</Link>
                        </Button>
                      )}
                      {!isPassed && (
                        <Button size="lg" onClick={() => {
                          setShowResults(false)
                          setCurrentQuestionIndex(0)
                          setSelectedAnswers({})
                          setQuizResult(null)
                          setHasStartedAudio(false)
                        }} className="bg-[#01402E] hover:bg-[#01402E]/90 text-white">
                          Retake Quiz
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Quiz view
  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div>
          {/* Main Content */}
          <div>
            <Card className="border-[#01402E]/20 bg-white">
              <CardContent className="pt-6">
                {/* Progress bar + sound toggle */}
                <div className="mb-6">
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-2 gap-3">
                    <div>
                      <span>
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                      </span>
                      <span className="ml-3 text-[#01402E] font-semibold">
                        {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleSound}
                      className="border-[#01402E]/40 text-[#01402E] hover:bg-[#01402E]/10 flex items-center gap-2"
                    >
                      {isSoundEnabled ? (
                        <>
                          <Volume2 size={16} />
                          <span className="hidden sm:inline">Sound on</span>
                        </>
                      ) : (
                        <>
                          <VolumeX size={16} />
                          <span className="hidden sm:inline">Sound off</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#01402E]/20">
                    <div
                      className="h-full bg-[#01402E] transition-all"
                      style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                {currentQuestion && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <h2 className="text-2xl font-bold text-[#01402E] flex-1">
                          {currentQuestion.question}
                        </h2>
                      </div>
                    </div>

                    {/* Options - Kahoot style */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getOptions(currentQuestion).map((option, index) => {
                        const color = OPTION_COLORS[index % OPTION_COLORS.length]
                        const isSelected = selectedAnswers[currentQuestion.id] === option
                        return (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                            className={cn(
                              "relative p-6 rounded-lg border-2 transition-all transform hover:scale-105 hover:shadow-lg text-left",
                              color.bg,
                              color.border,
                              isSelected ? "ring-4 ring-offset-2 ring-[#01402E]" : "",
                              "text-white font-semibold text-lg"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="flex-1">{option}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-6 h-6 ml-2" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className="border-[#01402E]/30 text-[#01402E] hover:bg-[#01402E]/10"
                      >
                        <ChevronLeft size={16} className="mr-2" />
                        Previous
                      </Button>
                      <div className="flex-1" />
                      {currentQuestionIndex < totalQuestions - 1 ? (
                        <Button
                          onClick={handleNext}
                          disabled={!selectedAnswers[currentQuestion.id]}
                          className="bg-[#01402E] hover:bg-[#01402E]/90 text-white"
                        >
                          Next
                          <ChevronRight size={16} className="ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubmit}
                          disabled={!selectedAnswers[currentQuestion.id] || submitQuizMutation.isPending}
                          size="lg"
                          className="bg-[#01402E] hover:bg-[#01402E]/90 text-white"
                        >
                          {submitQuizMutation.isPending ? (
                            <>
                              <Loader2 size={18} className="mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Quiz"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

