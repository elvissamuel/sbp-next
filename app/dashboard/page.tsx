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

  // Filter out drafted courses - only show published courses
  const publishedEnrollments = enrollments.filter(
    (enrollment: EnrollmentWithCourse) => enrollment.course.status !== "draft"
  )

  // Transform enrollments to the format expected by the UI
  const enrolledCourses = publishedEnrollments.map((enrollment: EnrollmentWithCourse) => {
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
      <div className="space-y-8 bg-white">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-[#65B32E]">Welcome back {currentUser?.name}</h1>
          <p className="text-muted-foreground">Continue your learning journey</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#65B32E]">Active Courses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#65B32E]">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#65B32E]" />
                ) : (
                  enrolledCourses.filter((c) => c.status === "in-progress").length
                )}
              </div>
              <p className="text-xs text-muted-foreground">courses in progress</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#DE1915]">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#DE1915]">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#DE1915]" />
                ) : (
                  enrolledCourses.filter((c) => c.status === "completed").length
                )}
              </div>
              <p className="text-xs text-muted-foreground">courses completed</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#65B32E]">Avg Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#65B32E]">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#65B32E]" />
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
            <h2 className="text-2xl font-bold text-[#65B32E]">Your Courses</h2>
            {/* <Button asChild variant="outline" size="sm">
              <Link href="/course">Browse More</Link>
            </Button> */}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#65B32E]" />
              <span className="ml-2 text-sm text-muted-foreground">Loading your courses...</span>
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card className="border-border/50 bg-white">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-[#65B32E] mb-4" />
                <h3 className="text-lg font-semibold text-[#65B32E] mb-2">No courses displayed</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  There are no courses displayed because you have not been enrolled in any course yet. Browse available courses and enroll to get started with your learning journey.
                </p>
                <Button asChild className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white">
                  <Link href="/course">Browse Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="in-progress" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-[#65B32E]/20">
                <TabsTrigger value="in-progress" className="data-[state=active]:bg-[#65B32E] data-[state=active]:text-white text-[#65B32E]">
                  In Progress ({enrolledCourses.filter((c) => c.status === "in-progress").length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-[#DE1915] data-[state=active]:text-white text-[#DE1915]">
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
                      className="overflow-hidden border-border/50 hover:border-[#65B32E]/50 transition-colors bg-white"
                    >
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img
                          src={course.banner || "/placeholder.svg"}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-2 text-[#65B32E]">{course.title}</CardTitle>
                        <CardDescription>
                          {course.lessons > 0 ? `${course.completedLessons} of ${course.lessons} lessons` : "No lessons yet"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-[#65B32E]">{course.progress}%</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#65B32E]/20">
                            <div 
                              className="h-full bg-[#65B32E] transition-all"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                        <Button asChild size="sm" className="w-full bg-[#65B32E] hover:bg-[#65B32E]/90 text-white">
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
                  <Card className="border-border/50 bg-white">
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
                      <Card key={course.id} className="overflow-hidden border-border/50 bg-white hover:border-[#DE1915]/50 transition-colors">
                        <div className="aspect-video bg-muted overflow-hidden">
                          <img
                            src={course.banner || "/placeholder.svg"}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base line-clamp-2 text-[#DE1915]">{course.title}</CardTitle>
                            <Badge className="flex-shrink-0 bg-[#DE1915] text-white border-[#DE1915]">
                              <CheckCircle2 size={12} className="mr-1" />
                              Complete
                            </Badge>
                          </div>
                          <CardDescription>
                            {course.lessons > 0 ? `${course.completedLessons} of ${course.lessons} lessons` : "Course completed"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button asChild size="sm" className="w-full border-[#DE1915] text-[#DE1915] hover:bg-[#DE1915] hover:text-white" variant="outline">
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
                  <Card className="border-border/50 bg-white">
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
