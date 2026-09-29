"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getCourse, type CourseModule, type Lesson, type Quiz } from "@/lib/api-calls"
import { getUserFullName } from "@/lib/utils/user"

type QuizAttemptRow = {
  id: string
  userId: string
  score: number
  passed: boolean
  attemptedAt: string
}

type QuizWithAttempts = Quiz & { attempts?: QuizAttemptRow[] }

export default function CourseMemberPerformancePage() {
  const params = useParams()
  const courseId = params.courseId as string
  const userId = params.userId as string

  const { data: courseResponse, isLoading, error } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
  })

  const course = courseResponse?.data
  const enrollment = course?.enrollments?.find((item) => item.userId === userId)
  const completedLessonIds = new Set((enrollment?.completions || []).map((completion) => completion.lessonId))
  const modules = (course?.modules || []) as CourseModule[]
  const quizzes = ((course?.quizzes || []) as QuizWithAttempts[]).map((quiz) => {
    const attempts = (quiz.attempts || [])
      .filter((attempt) => attempt.userId === userId)
      .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime())
    const latest = attempts[attempts.length - 1]
    const best = attempts.reduce<QuizAttemptRow | null>((current, attempt) => {
      if (!current || attempt.score > current.score) return attempt
      return current
    }, null)
    return { quiz, attempts, latest, best }
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !course || !enrollment) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <AppBreadcrumbs />
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-destructive">This member is not enrolled in the course.</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href={`/org/course/${courseId}`}>Back to course</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const memberName = getUserFullName(enrollment.user.firstName, enrollment.user.lastName, enrollment.user.name) || enrollment.user.email
  const lessons = modules.flatMap((module) => module.lessons || [])
  const completedLessons = lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{memberName}</h1>
            <p className="text-muted-foreground">{enrollment.user.email} · {course.title}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/org/course/${courseId}`}>Back to course</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollment.progress}%</div>
              <Progress value={enrollment.progress} className="mt-3 h-2" />
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedLessons} of {lessons.length}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={enrollment.status === "completed" || enrollment.progress === 100 ? "default" : "secondary"}>
                {enrollment.status === "completed" || enrollment.progress === 100 ? "Completed" : enrollment.status === "paused" ? "Paused" : "Active"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Lessons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((module) => (
              <div key={module.id} className="space-y-2">
                <p className="text-sm font-semibold">{module.title}</p>
                {(module.lessons || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lessons in this module.</p>
                ) : (
                  (module.lessons || []).map((lesson: Lesson) => {
                    const completed = completedLessonIds.has(lesson.id)
                    return (
                      <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{lesson.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{completed ? "Completed" : "Not completed"}</span>
                      </div>
                    )
                  })
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">This course has no quizzes.</p>
            ) : (
              quizzes.map(({ quiz, attempts, latest, best }) => {
                const latestPercent = latest && quiz.totalPoints ? Math.round((latest.score / quiz.totalPoints) * 100) : null
                const bestPercent = best && quiz.totalPoints ? Math.round((best.score / quiz.totalPoints) * 100) : null
                return (
                  <div key={quiz.id} className="rounded-md border border-border/50 p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground">Attempts: {attempts.length}</p>
                      </div>
                      {latest ? (
                        <div className="text-right">
                          <p className={latest.passed ? "font-semibold text-primary" : "font-semibold text-destructive"}>
                            {latestPercent !== null ? `${latestPercent}%` : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{latest.passed ? "Passed" : "Not passed"}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not attempted</p>
                      )}
                    </div>
                    {bestPercent !== null ? (
                      <p className="mt-2 text-xs text-muted-foreground">Best score: {bestPercent}%</p>
                    ) : null}
                    {attempts.length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {attempts.map((attempt, index) => {
                          const percentage = quiz.totalPoints ? Math.round((attempt.score / quiz.totalPoints) * 100) : null
                          return (
                            <p key={attempt.id}>
                              Attempt {index + 1}: {percentage !== null ? `${percentage}%` : "—"} · {attempt.passed ? "Passed" : "Not passed"} · {format(new Date(attempt.attemptedAt), "MMM d, yyyy")}
                            </p>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
