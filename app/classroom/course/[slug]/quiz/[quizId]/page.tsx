"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Loader2, HelpCircle, FileText, Clock, Trophy, AlertCircle } from "lucide-react"
import { getQuiz, getCourseBySlug, submitQuiz, type Lesson, type Quiz, type QuizQuestion } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { useState } from "react"
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

  // Calculate which lessons are completed
  const completedLessonsCount = stats.completedLessons
  const isLessonCompleted = (index: number) => {
    return index < completedLessonsCount
  }

  // Find current quiz index
  const currentQuizIndex = quizzes.findIndex((q: Quiz) => q.id === quizId)
  const nextQuiz = currentQuizIndex < quizzes.length - 1 ? quizzes[currentQuizIndex + 1] : null

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: (answers: Record<string, string>) => {
      if (!userId) throw new Error("User not logged in")
      return submitQuiz(userId, quizId, answers)
    },
    onSuccess: (response) => {
      if (response.data) {
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
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!quiz) {
    return (
      <DashboardLayout>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-destructive">Quiz not found.</p>
            <Button variant="outline" asChild className="mt-4">
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
        <div className="space-y-6">
          <AppBreadcrumbs />
          <div className="grid md:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="md:col-span-3">
              <Card className="border-border/50">
                <CardContent className="pt-12 pb-12">
                  <div className="max-w-2xl mx-auto text-center space-y-6">
                    <div className={cn(
                      "w-24 h-24 rounded-full mx-auto flex items-center justify-center",
                      isPassed ? "bg-green-100" : "bg-red-100"
                    )}>
                      {isPassed ? (
                        <Trophy className="w-12 h-12 text-green-600" />
                      ) : (
                        <AlertCircle className="w-12 h-12 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-foreground mb-2">
                        {isPassed ? "Congratulations!" : "Try Again!"}
                      </h1>
                      <p className="text-xl text-muted-foreground">
                        You scored {quizResult.score} out of {quizResult.totalPoints} points
                      </p>
                      <p className="text-2xl font-bold mt-4" style={{ color: isPassed ? "#16a34a" : "#dc2626" }}>
                        {percentage}%
                      </p>
                    </div>
                    {quiz.description && (
                      <p className="text-muted-foreground">{quiz.description}</p>
                    )}
                    <div className="flex gap-3 justify-center pt-4">
                      {isPassed && nextQuiz ? (
                        <Button asChild size="lg">
                          <Link href={`/classroom/course/${slug}/quiz/${nextQuiz.id}`}>
                            Next Quiz
                            <ChevronRight size={18} className="ml-2" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="lg" variant="outline">
                          <Link href={`/classroom/course/${slug}`}>Back to Course</Link>
                        </Button>
                      )}
                      {!isPassed && (
                        <Button size="lg" onClick={() => {
                          setShowResults(false)
                          setCurrentQuestionIndex(0)
                          setSelectedAnswers({})
                          setQuizResult(null)
                        }}>
                          Retake Quiz
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              <Card className="border-border/50 sticky top-20">
                <CardContent className="pt-6">
                  <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Sidebar content same as lesson view */}
                    {lessons.map((l: Lesson, index: number) => {
                      const isCompleted = isLessonCompleted(index)
                      return (
                        <Link
                          key={l.id}
                          href={`/classroom/course/${slug}/lesson/${l.id}`}
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
                              {l.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">Lesson {l.order + 1}</p>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                    {quizzes.map((q: Quiz) => {
                      const isActive = q.id === quizId
                      return (
                        <Link
                          key={q.id}
                          href={`/classroom/course/${slug}/quiz/${q.id}`}
                          className={cn(
                            "flex items-start gap-3 p-2 rounded-md transition group",
                            isActive ? "bg-accent border border-primary/20" : "hover:bg-accent"
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <HelpCircle size={18} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium transition line-clamp-2",
                              isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                            )}>
                              {q.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">Quiz</p>
                          </div>
                        </Link>
                      )
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

  // Quiz view
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="grid md:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="md:col-span-3">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                    <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
                  </div>
                  <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="h-2" />
                </div>

                {/* Question */}
                {currentQuestion && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-4">
                        {currentQuestion.question}
                      </h2>
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
                              isSelected ? "ring-4 ring-offset-2 ring-primary" : "",
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
                      >
                        <ChevronLeft size={16} className="mr-2" />
                        Previous
                      </Button>
                      <div className="flex-1" />
                      {currentQuestionIndex < totalQuestions - 1 ? (
                        <Button
                          onClick={handleNext}
                          disabled={!selectedAnswers[currentQuestion.id]}
                        >
                          Next
                          <ChevronRight size={16} className="ml-2" />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleSubmit}
                          disabled={!selectedAnswers[currentQuestion.id] || submitQuizMutation.isPending}
                          size="lg"
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

          {/* Sidebar - Course Contents */}
          <div>
            <Card className="border-border/50 sticky top-20">
              <CardContent className="pt-6">
                <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {lessons.map((l: Lesson, index: number) => {
                    const isCompleted = isLessonCompleted(index)
                    return (
                      <Link
                        key={l.id}
                        href={`/classroom/course/${slug}/lesson/${l.id}`}
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
                            {l.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">Lesson {l.order + 1}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  {quizzes.map((q: Quiz) => {
                    const isActive = q.id === quizId
                    return (
                      <Link
                        key={q.id}
                        href={`/classroom/course/${slug}/quiz/${q.id}`}
                        className={cn(
                          "flex items-start gap-3 p-2 rounded-md transition group",
                          isActive ? "bg-accent border border-primary/20" : "hover:bg-accent"
                        )}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <HelpCircle size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium transition line-clamp-2",
                            isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                          )}>
                            {q.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Quiz</p>
                        </div>
                      </Link>
                    )
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

