"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getPrimaryOrganization } from "@/lib/session"
import { Loader2, ChevronLeft } from "lucide-react"

type ReportResponse = {
  user: {
    id: string
    email: string
    name: string
    firstName: string | null
    lastName: string | null
    jobTitle: string | null
    department: string | null
  }
  organization: {
    id: string
    name: string
  }
  summary: {
    coursesEnrolled: number
    coursesCompleted: number
    avgCourseProgress: number
    totalQuizzes: number
    quizzesPassed: number
    avgQuizScorePercent: number
  }
  courses: Array<{
    enrollment: {
      id: string
      status: string
      progress: number
      createdAt: string
      updatedAt: string
      completedAt: string | null
    }
    course: {
      id: string
      title: string
      status: string
      createdAt: string
      updatedAt: string
      totalLessons: number
    }
    progress: {
      progress: number
      completedLessons: number
      totalLessons: number
      quizProgress: number
    }
    quizSummary: {
      quizzesTotal: number
      quizzesAttempted: number
      quizzesPassed: number
      avgQuizScorePercent: number
    }
    quizzes: Array<{
      id: string
      title: string
      passingScore: number
      totalPoints: number
      status: string
      attemptsCount: number
      latestAttempt: {
        id: string
        score: number
        percentage: number | null
        passed: boolean
        attemptedAt: string
      } | null
      best: { score: number; percentage: number | null } | null
      passed: boolean
    }>
  }>
}

export default function EmployeeReportPage() {
  const params = useParams()
  const userId = params.userId as string

  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-performance-report", organizationId, userId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/user-performance?organizationId=${organizationId}&userId=${userId}`, {
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load report")
      }
      return json as ReportResponse
    },
    enabled: !!organizationId && !!userId,
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-[#01402E]">Performance Report</h1>
            {data?.user ? (
              <p className="text-black">
                {data.user.name} ({data.user.email})
              </p>
            ) : (
              <p className="text-black">Per-user course performance report</p>
            )}
          </div>
          <Button asChild variant="outline" className="border-[#01402E]/30 text-[#01402E] hover:bg-[#01402E]/10">
            <Link href="/org/employee">
              <ChevronLeft size={16} className="mr-2" />
              Back to Employees
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <Card className="border-[#01402E]/20 bg-white">
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#01402E]" />
                <span className="ml-2 text-sm text-black">Loading report...</span>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-[#DE1915]/20 bg-white">
            <CardContent className="py-8">
              <p className="text-[#DE1915] text-sm">{(error as Error).message}</p>
            </CardContent>
          </Card>
        ) : !data ? (
          <Card className="border-[#DE1915]/20 bg-white">
            <CardContent className="py-8">
              <p className="text-[#DE1915] text-sm">No report data found.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-[#01402E]/20 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-black">Courses Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#01402E]">
                    {data.summary.coursesCompleted}/{data.summary.coursesEnrolled}
                  </div>
                  <p className="text-xs text-black">Enrolled courses</p>
                </CardContent>
              </Card>
              <Card className="border-[#01402E]/20 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-black">Average Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold text-[#01402E]">{data.summary.avgCourseProgress}%</div>
                  <Progress value={data.summary.avgCourseProgress} className="h-2" />
                </CardContent>
              </Card>
              <Card className="border-[#01402E]/20 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-black">Quiz Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-2xl font-bold text-[#01402E]">{data.summary.avgQuizScorePercent}%</div>
                  <p className="text-xs text-black">
                    Passed {data.summary.quizzesPassed}/{data.summary.totalQuizzes} quizzes
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {data.courses.length === 0 ? (
                <Card className="border-[#01402E]/20 bg-white">
                  <CardContent className="py-8">
                    <p className="text-black text-sm">This employee is not enrolled in any courses yet.</p>
                  </CardContent>
                </Card>
              ) : (
                data.courses.map((courseReport) => (
                  <Card key={courseReport.course.id} className="border-[#01402E]/20 bg-white">
                    <CardHeader>
                      <CardTitle className="text-[#01402E]">{courseReport.course.title}</CardTitle>
                      <div className="text-sm text-black">
                        Lessons: {courseReport.progress.completedLessons}/{courseReport.progress.totalLessons}
                        {courseReport.quizSummary.quizzesTotal > 0 ? (
                          <>
                            {" "}• Quizzes passed: {courseReport.quizSummary.quizzesPassed}/{courseReport.quizSummary.quizzesTotal}
                          </>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-black">Overall progress</span>
                          <span className="font-medium text-[#01402E]">{courseReport.progress.progress}%</span>
                        </div>
                        <Progress value={courseReport.progress.progress} className="h-2" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-black">Quiz breakdown</h3>
                          <div className="text-xs text-black">
                            Avg quiz score: {courseReport.quizSummary.avgQuizScorePercent}%
                          </div>
                        </div>

                        {courseReport.quizzes.length === 0 ? (
                          <div className="text-sm text-black">No quizzes in this course.</div>
                        ) : (
                          <div className="space-y-2">
                            {courseReport.quizzes.map((quiz) => (
                              <div key={quiz.id} className="rounded-md border border-[#01402E]/20 p-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-medium text-black">{quiz.title}</div>
                                    <div className="text-xs text-black">
                                      Pass mark: {Math.round(quiz.passingScore)}%
                                      {" "}• Attempts: {quiz.attemptsCount}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {quiz.latestAttempt ? (
                                      <div className={quiz.latestAttempt.passed ? "text-[#01402E]" : "text-[#DE1915]"}>
                                        <div className="font-semibold">
                                          {quiz.latestAttempt.percentage !== null ? `${quiz.latestAttempt.percentage}%` : "—"}
                                        </div>
                                        <div className="text-xs text-black">
                                          {quiz.latestAttempt.passed ? "Passed" : "Not passed"}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-black">Not attempted</div>
                                    )}
                                  </div>
                                </div>
                                {quiz.best ? (
                                  <div className="mt-2 text-xs text-black">
                                    Best score: {quiz.best.percentage !== null ? `${quiz.best.percentage}%` : "—"}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
