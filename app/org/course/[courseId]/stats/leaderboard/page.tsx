"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Download, Loader2 } from "lucide-react"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getCourse, type EnrollmentWithUser, type Quiz } from "@/lib/api-calls"
import { useMemo } from "react"

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  email: string
  image: string | null
  progress: number
  quizScore: number
  status: string
}

export default function LeaderboardPage() {
  const params = useParams()
  const courseId = params.courseId as string

  // Fetch course data with enrollments and quizzes
  const { data: courseResponse, isLoading, error } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
  })

  const course = courseResponse?.data
  const enrollments = course?.enrollments || []
  const quizzes = course?.quizzes || []

  // Calculate leaderboard rankings
  const leaderboard = useMemo(() => {
    if (!enrollments.length) {
      return []
    }

    // Get all quiz attempts for this course (quizzes may have attempts attached from API)
    const allQuizAttempts = quizzes.flatMap((quiz: any) =>
      (quiz.attempts || []).map((attempt: any) => ({
        userId: attempt.user.id,
        score: attempt.score,
        quizId: quiz.id,
      }))
    )

    // Calculate average quiz score per user
    const userQuizScores = new Map<string, { total: number; count: number }>()
    allQuizAttempts.forEach((attempt) => {
      const existing = userQuizScores.get(attempt.userId) || { total: 0, count: 0 }
      userQuizScores.set(attempt.userId, {
        total: existing.total + attempt.score,
        count: existing.count + 1,
      })
    })

    // Build leaderboard entries
    const entries: LeaderboardEntry[] = enrollments.map((enrollment: EnrollmentWithUser) => {
      const quizData = userQuizScores.get(enrollment.userId)
      const avgQuizScore =
        quizData && quizData.count > 0
          ? Math.round((quizData.total / quizData.count) * 100) / 100
          : 0

      return {
        rank: 0, // Will be calculated after sorting
        userId: enrollment.userId,
        name: enrollment.user.name || enrollment.user.email,
        email: enrollment.user.email,
        image: enrollment.user.image,
        progress: enrollment.progress,
        quizScore: avgQuizScore,
        status: enrollment.status,
      }
    })

    // Sort by quiz score (descending), then by progress (descending), then by completion status
    entries.sort((a, b) => {
      // First sort by quiz score
      if (b.quizScore !== a.quizScore) {
        return b.quizScore - a.quizScore
      }
      // Then by progress
      if (b.progress !== a.progress) {
        return b.progress - a.progress
      }
      // Finally by completion status (completed first)
      if (a.status === "completed" && b.status !== "completed") return -1
      if (b.status === "completed" && a.status !== "completed") return 1
      return 0
    })

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1
    })

    return entries
  }, [enrollments, quizzes])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <AppBreadcrumbs />
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !course) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <AppBreadcrumbs />
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load course data.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Course Leaderboard</h1>
            <p className="text-muted-foreground">Track student progress and performance</p>
          </div>
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>

        {leaderboard.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center py-8">No enrolled students yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Quiz Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((student) => {
                    const initials = getInitials(student.name, student.email)
                    return (
                      <TableRow key={student.userId} className="border-border/40">
                        <TableCell className="font-bold text-lg">
                          {student.rank === 1 && "🥇"}
                          {student.rank === 2 && "🥈"}
                          {student.rank === 3 && "🥉"}
                          {student.rank > 3 && student.rank}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.image || undefined} alt={student.name} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{student.email}</TableCell>
                        <TableCell>
                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">{student.progress}%</span>
                            </div>
                            <Progress value={student.progress} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {student.quizScore > 0 ? `${student.quizScore}%` : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === "completed" || student.progress === 100
                                ? "default"
                                : student.status === "paused"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {student.status === "completed" || student.progress === 100
                              ? "Completed"
                              : student.status === "paused"
                                ? "Paused"
                                : "Active"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
