"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Loader2 } from "lucide-react"
import { getUserEnrollments, type EnrollmentWithCourse } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"
import { getUserFullName } from "@/lib/utils/user"

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
      <div className="space-y-6 bg-white">
        <Card className="border-0 rounded-xl overflow-hidden">
          <div className="relative bg-gradient-to-r from-[#01402E] to-[#589F8B] px-6 py-8">
            <div className="absolute right-0 top-0 h-full w-40 opacity-25">
              <div className="absolute right-6 top-6 h-16 w-16 rounded-xl bg-white/20" />
              <div className="absolute right-14 top-16 h-16 w-16 rounded-xl bg-white/20" />
              <div className="absolute right-2 top-20 h-16 w-16 rounded-xl bg-white/20" />
              <div className="absolute right-10 top-32 h-16 w-16 rounded-xl bg-white/20" />
            </div>
            <div className="relative">
              <p className="text-white/80 text-sm">Welcome</p>
              <h1 className="text-white text-2xl font-semibold leading-tight">
                {getUserFullName(currentUser?.firstName, currentUser?.lastName, currentUser?.name)}
              </h1>
              <p className="text-white/80 text-xs mt-1">Continue with your learning</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="rounded-lg border-0 bg-[#FFF4E8]">
            <CardContent className="p-4">
              <p className="text-[14px] font-medium text-[#F97316]">Active</p>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#F97316]" /> : enrolledCourses.filter((c) => c.status === "in-progress").length}
              </div>
              <p className="text-[14px] text-muted-foreground">courses in progress</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-0 bg-[#E9FBEF]">
            <CardContent className="p-4">
              <p className="text-[14px] font-medium text-[#22C55E]">Completed</p>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#22C55E]" /> : enrolledCourses.filter((c) => c.status === "completed").length}
              </div>
              <p className="text-[14px] text-muted-foreground">courses completed</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-0 bg-[#EAF4FF]">
            <CardContent className="p-4">
              <p className="text-[14px] font-medium text-[#3B82F6]">Average Progress</p>
              <div className="mt-2 text-2xl font-semibold text-[#111827]">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#3B82F6]" />
                ) : enrolledCourses.length > 0 ? (
                  `${Math.round(enrolledCourses.reduce((acc, c) => acc + c.progress, 0) / enrolledCourses.length)}%`
                ) : (
                  "0%"
                )}
              </div>
              <p className="text-[14px] text-muted-foreground">across all course</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-[#111827]">Your Courses</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[#2C6B5B]" />
              <span className="ml-2 text-sm text-muted-foreground">Loading your courses...</span>
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card className="border border-border/40 rounded-lg">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <BookOpen className="h-10 w-10 text-[#2C6B5B] mb-4" />
                <h3 className="text-base font-semibold text-[#111827] mb-2">No courses displayed</h3>
                <p className="text-xs text-muted-foreground text-center mb-4 max-w-md">
                  There are no courses displayed because you have not been enrolled in any course yet. Browse available courses and enroll to get started with your learning journey.
                </p>
                <Button asChild className="bg-[#2C6B5B] hover:bg-[#2C6B5B]/90 text-white rounded-md h-9 px-6">
                  <Link href="/course">Browse Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="in-progress" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-md bg-[#F3F4F6] p-1 h-10">
                <TabsTrigger
                  value="in-progress"
                  className="rounded-md data-[state=active]:bg-[#01402E] data-[state=active]:text-white text-muted-foreground"
                >
                  In progress
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="rounded-md data-[state=active]:bg-[#01402E] data-[state=active]:text-white text-muted-foreground"
                >
                  Completed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="in-progress" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enrolledCourses
                    .filter((c) => c.status === "in-progress")
                    .slice(0, 6)
                    .map((course) => (
                      <Card key={course.id} className="rounded-lg border border-border/40 overflow-hidden">
                        <div className="bg-[#111827]">
                          <div className="aspect-[16/7] opacity-90">
                            <img src={course.banner || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <div className="inline-flex items-center rounded-sm bg-[#E5F6EE] px-2 py-1 text-[10px] font-medium text-[#0F766E]">
                              IN PROGRESS
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-[#111827] leading-snug line-clamp-2">{course.title}</h3>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {course.lessons > 0 ? `${course.completedLessons} of ${course.lessons} lessons` : "0 of 0 lessons"}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="text-muted-foreground">{course.progress}%</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
                              <div className="h-full bg-[#0F766E]" style={{ width: `${course.progress}%` }} />
                            </div>
                          </div>
                          <Button asChild className="w-full h-9 rounded-md bg-[#01402E] hover:bg-[#01402E]/90 text-white text-xs">
                            <Link href={`/classroom/course/${course.id}`}>Start learning</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {enrolledCourses
                    .filter((c) => c.status === "completed")
                    .slice(0, 6)
                    .map((course) => (
                      <Card key={course.id} className="rounded-lg border border-border/40 overflow-hidden">
                        <div className="bg-[#111827]">
                          <div className="aspect-[16/7] opacity-90">
                            <img src={course.banner || "/placeholder.svg"} alt={course.title} className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <div className="inline-flex items-center rounded-sm bg-[#F3F4F6] px-2 py-1 text-[10px] font-medium text-[#6B7280]">
                              COMPLETED
                            </div>
                            <h3 className="mt-2 text-sm font-semibold text-[#111827] leading-snug line-clamp-2">{course.title}</h3>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {course.lessons > 0 ? `${course.completedLessons} of ${course.lessons} lessons` : "Course completed"}
                            </p>
                          </div>
                          <Button asChild className="w-full h-9 rounded-md bg-[#01402E] hover:bg-[#01402E]/90 text-white text-xs">
                            <Link href={`/classroom/course/${course.id}`}>Start learning</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
