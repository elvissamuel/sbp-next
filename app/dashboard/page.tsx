"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, PlayCircle, CheckCircle2, Loader2 } from "lucide-react"
import { getUserEnrollments, type EnrollmentWithCourse } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"

export default function DashboardPage() {
  const currentUser = getCurrentUser()
  const userId = currentUser?.id || ""

  // Fetch user enrollments
  const { data: enrollmentsResponse, isLoading } = useQuery({
    queryKey: ["user-enrollments", userId],
    queryFn: () => getUserEnrollments(userId),
    enabled: !!userId,
  })

  const enrollments = enrollmentsResponse?.data || []

  // Transform enrollments to the format expected by the UI
  const enrolledCourses = enrollments.map((enrollment: EnrollmentWithCourse) => {
    const course = enrollment.course
    const progress = enrollment.progress || 0
    const status = enrollment.status === "completed" ? "completed" : enrollment.status === "paused" ? "paused" : "in-progress"
    
    // Get lesson count from course.lessons array
    const totalLessons = course.lessons?.length || 0
    // Calculate completed lessons based on progress percentage
    const completedLessons = totalLessons > 0 ? Math.round((progress / 100) * totalLessons) : 0

    return {
      id: course.id,
      title: course.title,
      progress: progress,
      status: status,
      lessons: totalLessons,
      completedLessons: completedLessons,
      banner: course.thumbnail || "/placeholder.svg",
      enrollmentId: enrollment.id,
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back {currentUser?.name}</h1>
          <p className="text-muted-foreground">Continue your learning journey</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  enrolledCourses.filter((c) => c.status === "in-progress").length
                )}
              </div>
              <p className="text-xs text-muted-foreground">courses in progress</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  enrolledCourses.filter((c) => c.status === "completed").length
                )}
              </div>
              <p className="text-xs text-muted-foreground">courses completed</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : enrolledCourses.length > 0 ? (
                  `${Math.round(enrolledCourses.reduce((acc, c) => acc + c.progress, 0) / enrolledCourses.length)}%`
                ) : (
                  "0%"
                )}
              </div>
              <p className="text-xs text-muted-foreground">across all courses</p>
            </CardContent>
          </Card>
        </div>

        {/* Courses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Your Courses</h2>
            {/* <Button asChild variant="outline" size="sm">
              <Link href="/course">Browse More</Link>
            </Button> */}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading your courses...</span>
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No courses yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  You haven't enrolled in any courses yet. Browse available courses to get started.
                </p>
                <Button asChild>
                  <Link href="/course">Browse Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="in-progress" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="in-progress">
                  In Progress ({enrolledCourses.filter((c) => c.status === "in-progress").length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({enrolledCourses.filter((c) => c.status === "completed").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="in-progress" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledCourses
                    .filter((c) => c.status === "in-progress")
                    .map((course) => (
                    <Card
                      key={course.id}
                      className="overflow-hidden border-border/50 hover:border-border transition-colors"
                    >
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img
                          src={course.banner || "/placeholder.svg"}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                        <CardDescription>
                          {course.lessons > 0 ? `${course.completedLessons} of ${course.lessons} lessons` : "No lessons yet"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} />
                        </div>
                        <Button asChild size="sm" className="w-full">
                          <Link href={`/classroom/course/${course.id}`}>
                            <PlayCircle size={16} className="mr-2" />
                            Continue
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                    ))}
                </div>
                {enrolledCourses.filter((c) => c.status === "in-progress").length === 0 && (
                  <Card className="border-border/50">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">No courses in progress</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledCourses
                    .filter((c) => c.status === "completed")
                    .map((course) => (
                      <Card key={course.id} className="overflow-hidden border-border/50">
                        <div className="aspect-video bg-muted overflow-hidden">
                          <img
                            src={course.banner || "/placeholder.svg"}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                            <Badge className="flex-shrink-0">
                              <CheckCircle2 size={12} className="mr-1" />
                              Complete
                            </Badge>
                          </div>
                          <CardDescription>
                            {course.lessons > 0 ? `${course.completedLessons} of ${course.lessons} lessons` : "Course completed"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild size="sm" className="w-full bg-transparent" variant="outline">
                            <Link href={`/classroom/course/${course.id}`}>
                              <BookOpen size={16} className="mr-2" />
                              Review
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
                {enrolledCourses.filter((c) => c.status === "completed").length === 0 && (
                  <Card className="border-border/50">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">No completed courses yet</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
