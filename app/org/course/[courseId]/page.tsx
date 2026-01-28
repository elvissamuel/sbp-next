"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useParams, useRouter } from "next/navigation"
import { Plus, Settings, BarChart3, Loader2, FileText, HelpCircle, Edit, Trash2, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { getCourse, deleteLesson, updateLessonStatus, updateQuizStatus, type Lesson, type Quiz, type EnrollmentWithUser } from "@/lib/api-calls"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useState } from "react"


export default function ViewCoursePage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const courseId = params.courseId as string

  // State for confirmation dialogs
  const [pendingLessonAction, setPendingLessonAction] = useState<{ id: string; status: string; title: string } | null>(null)
  const [pendingQuizAction, setPendingQuizAction] = useState<{ id: string; status: string; title: string } | null>(null)

  // Fetch course with lessons and quizzes
  const { data: courseResponse, isLoading, error } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
    enabled: !!courseId,
  })

  const course = courseResponse?.data
  const lessons = course?.lessons || []
  const quizzes = course?.quizzes || []
  const enrollments = course?.enrollments || []
  const stats = course?.stats || { enrollments: 0, completionRate: 0, avgScore: 0 }

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => deleteLesson(lessonId),
    onSuccess: () => {
      toast.success("Lesson deleted successfully")
      queryClient.invalidateQueries({ queryKey: ["course", courseId] })
    },
    onError: (error: any) => {
      toast.error("Failed to delete lesson", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  // Update lesson status mutation
  const updateLessonStatusMutation = useMutation({
    mutationFn: ({ lessonId, status }: { lessonId: string; status: string }) => updateLessonStatus(lessonId, status),
    onSuccess: () => {
      toast.success("Lesson status updated successfully")
      queryClient.invalidateQueries({ queryKey: ["course", courseId] })
    },
    onError: (error: any) => {
      toast.error("Failed to update lesson status", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  // Update quiz status mutation
  const updateQuizStatusMutation = useMutation({
    mutationFn: ({ quizId, status }: { quizId: string; status: string }) => updateQuizStatus(quizId, status),
    onSuccess: () => {
      toast.success("Quiz status updated successfully")
      queryClient.invalidateQueries({ queryKey: ["course", courseId] })
    },
    onError: (error: any) => {
      toast.error("Failed to update quiz status", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const handleDeleteLesson = (lessonId: string) => {
    deleteLessonMutation.mutate(lessonId)
  }

  const handleLessonStatusChange = (lessonId: string, status: string, title: string) => {
    setPendingLessonAction({ id: lessonId, status, title })
  }

  const confirmLessonStatusChange = () => {
    if (pendingLessonAction) {
      updateLessonStatusMutation.mutate({ lessonId: pendingLessonAction.id, status: pendingLessonAction.status })
      setPendingLessonAction(null)
    }
  }

  const handleQuizStatusChange = (quizId: string, status: string, title: string) => {
    setPendingQuizAction({ id: quizId, status, title })
  }

  const confirmQuizStatusChange = () => {
    if (pendingQuizAction) {
      updateQuizStatusMutation.mutate({ quizId: pendingQuizAction.id, status: pendingQuizAction.status })
      setPendingQuizAction(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="flex items-start justify-between">
          <div>
            {isLoading ? (
              <>
                <div className="h-9 w-64 bg-muted animate-pulse rounded mb-2" />
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              </>
            ) : error ? (
              <>
                <h1 className="text-3xl font-bold text-foreground">Course Not Found</h1>
                <p className="text-muted-foreground text-destructive">Failed to load course</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-foreground">{course?.title || "Course"}</h1>
                <p className="text-muted-foreground">{course?.description || `Course ID: ${courseId}`}</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/org/course/${courseId}/edit`}>
                <Settings size={16} className="mr-2" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/org/course/${courseId}/quiz/create`}>
                <Plus size={16} className="mr-2" />
                Create Quiz
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/org/course/${courseId}/lesson/create`}>
                <Plus size={16} className="mr-2" />
                Add Lesson
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Enrollments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.enrollments}</div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.completionRate}%</div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.avgScore}%</div>
                </CardContent>
              </Card>
            </div>

            <Button variant="outline" asChild>
              <Link href={`/org/course/${courseId}/stats/leaderboard`}>
                <BarChart3 size={16} className="mr-2" />
                View Leaderboard
              </Link>
            </Button>
          </TabsContent>

          <TabsContent value="lessons" className="space-y-4">
            {isLoading ? (
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ) : lessons.length === 0 && quizzes.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No lessons or quizzes yet. Create your first lesson or quiz to get started.</p>
                  <div className="flex gap-2 mt-4">
                    <Button asChild>
                      <Link href={`/org/course/${courseId}/lesson/create`}>
                        <Plus size={16} className="mr-2" />
                        Create Lesson
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/org/course/${courseId}/quiz/create`}>
                        <Plus size={16} className="mr-2" />
                        Create Quiz
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessons.map((lesson: Lesson) => (
                        <TableRow key={lesson.id} className="border-border/40">
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              <FileText size={14} />
                              Lesson
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{lesson.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={lesson.status === "published" ? "default" : "outline"}
                              >
                                {lesson.status === "published" ? "Published" : "Draft"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2">
                                    <ChevronDown size={14} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {lesson.status !== "draft" && (
                                    <DropdownMenuItem
                                      onClick={() => handleLessonStatusChange(lesson.id, "draft", lesson.title)}
                                    >
                                      Move to Draft
                                    </DropdownMenuItem>
                                  )}
                                  {lesson.status !== "published" && (
                                    <DropdownMenuItem
                                      onClick={() => handleLessonStatusChange(lesson.id, "published", lesson.title)}
                                    >
                                      Publish
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(lesson.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/org/course/${courseId}/lesson/${lesson.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {quizzes.map((quiz: Quiz) => (
                        <TableRow key={quiz.id} className="border-border/40">
                          <TableCell>
                            <Badge variant="default" className="gap-1">
                              <HelpCircle size={14} />
                              Quiz
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{quiz.title}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={quiz.status === "published" ? "default" : "outline"}
                              >
                                {quiz.status === "published" ? "Published" : "Draft"}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2">
                                    <ChevronDown size={14} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {quiz.status !== "draft" && (
                                    <DropdownMenuItem
                                      onClick={() => handleQuizStatusChange(quiz.id, "draft", quiz.title)}
                                    >
                                      Move to Draft
                                    </DropdownMenuItem>
                                  )}
                                  {quiz.status !== "published" && (
                                    <DropdownMenuItem
                                      onClick={() => handleQuizStatusChange(quiz.id, "published", quiz.title)}
                                    >
                                      Publish
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(quiz.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/org/course/${courseId}/quiz/${quiz.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            {isLoading ? (
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ) : enrollments.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No students enrolled yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Enrolled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment: EnrollmentWithUser) => {
                        const initials = enrollment.user.name
                          ? enrollment.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
                          : enrollment.user.email[0].toUpperCase()
                        
                        return (
                          <TableRow key={enrollment.id} className="border-border/40">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={enrollment.user.image || undefined} alt={enrollment.user.name || enrollment.user.email} />
                                  <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{enrollment.user.name || enrollment.user.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{enrollment.user.email}</TableCell>
                            <TableCell>
                              <div className="w-32">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">{enrollment.progress}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div className="bg-primary h-2 rounded-full" style={{ width: `${enrollment.progress}%` }} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  enrollment.status === "completed" || enrollment.progress === 100
                                    ? "default"
                                    : enrollment.status === "paused"
                                    ? "outline"
                                    : "secondary"
                                }
                              >
                                {enrollment.status === "completed" || enrollment.progress === 100
                                  ? "Completed"
                                  : enrollment.status === "paused"
                                  ? "Paused"
                                  : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(enrollment.createdAt), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog for Lesson Status Change */}
        <AlertDialog open={!!pendingLessonAction} onOpenChange={(open) => !open && setPendingLessonAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {pendingLessonAction?.status === "published" ? "publish" : "move to draft"} the lesson "{pendingLessonAction?.title}"?
                {pendingLessonAction?.status === "published" && " This will make it visible to enrolled students."}
                {pendingLessonAction?.status === "draft" && " This will hide it from enrolled students."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingLessonAction(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLessonStatusChange}>
                {pendingLessonAction?.status === "published" ? "Publish" : "Move to Draft"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog for Quiz Status Change */}
        <AlertDialog open={!!pendingQuizAction} onOpenChange={(open) => !open && setPendingQuizAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {pendingQuizAction?.status === "published" ? "publish" : "move to draft"} the quiz "{pendingQuizAction?.title}"?
                {pendingQuizAction?.status === "published" && " This will make it visible to enrolled students."}
                {pendingQuizAction?.status === "draft" && " This will hide it from enrolled students."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingQuizAction(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmQuizStatusChange}>
                {pendingQuizAction?.status === "published" ? "Publish" : "Move to Draft"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
