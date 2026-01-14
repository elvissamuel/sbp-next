"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { BookOpen, PlayCircle, CheckCircle2, Loader2 } from "lucide-react"
import { getUserEnrollments, type EnrollmentWithCourse } from "@/lib/api-calls"
import { getCurrentUser } from "@/lib/session"

export default function CourseListPage() {
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
      description: course.description || "",
      progress: progress,
      status: status,
      lessons: totalLessons,
      completedLessons: completedLessons,
      banner: course.thumbnail || "/placeholder.svg",
      enrollmentId: enrollment.id,
      slug: course.slug,
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
          <p className="text-muted-foreground">View and continue your enrolled courses</p>
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
                You haven't enrolled in any courses yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.map((course) => (
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
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2 flex-1">{course.title}</CardTitle>
                    {course.status === "completed" && (
                      <Badge className="flex-shrink-0">
                        <CheckCircle2 size={12} className="mr-1" />
                        Complete
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} />
                    <p className="text-xs text-muted-foreground">
                      {course.completedLessons} of {course.lessons} lessons
                    </p>
                  </div>
                  <Button asChild size="sm" className="w-full">
                    <Link href={`/classroom/course/${course.slug}`}>
                      <PlayCircle size={16} className="mr-2" />
                      {course.status === "completed" ? "Review" : "Continue"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
