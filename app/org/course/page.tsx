"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Edit2, Eye, Trash2, Loader2, UserPlus, Download, FileText, HelpCircle } from "lucide-react"
import { getCourses, getOrganizationMembers, enrollStudent, getDefaultCourses, copyCourse, type CourseWithRelations, type OrganizationMember } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import ReactSelect from "react-select"
import type { StylesConfig, MultiValue } from "react-select"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"

export default function CourseManagementPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  // Get primary organization from session
  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  const [openEnroll, setOpenEnroll] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<CourseWithRelations | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [openPreview, setOpenPreview] = useState(false)
  const [previewCourse, setPreviewCourse] = useState<CourseWithRelations | null>(null)

  // Fetch courses for the organization
  const { data: coursesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ["courses", organizationId],
    queryFn: () => getCourses(organizationId),
    enabled: !!organizationId,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider data stale so it refetches when needed
  })

  // Refetch courses when component mounts to ensure fresh data after navigation
  useEffect(() => {
    if (organizationId) {
      refetch()
    }
  }, [organizationId, refetch])

  // Fetch organization members for enrollment
  const { data: membersResponse, isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId),
    enabled: !!organizationId && openEnroll,
  })

  // Fetch default courses
  const { data: defaultCoursesResponse, isLoading: isLoadingDefaultCourses } = useQuery({
    queryKey: ["default-courses"],
    queryFn: () => getDefaultCourses(),
  })

  const courses = coursesResponse?.data || []
  const members = membersResponse?.data || []
  const defaultCourses = defaultCoursesResponse?.data || []

  // Prepare options for react-select
  const memberOptions = useMemo(() => {
    return members.map((member: OrganizationMember) => ({
      value: member.userId,
      label: `${member.name || "N/A"} (${member.email}) - ${member.role}`,
      member: member,
    }))
  }, [members])

  // Get selected options from selectedMembers array
  const selectedMemberOptions = useMemo(() => {
    return memberOptions.filter((option) => selectedMembers.includes(option.value))
  }, [memberOptions, selectedMembers])

  // Custom styles for react-select to match app theme
  type OptionType = { value: string; label: string; member: OrganizationMember }
  const selectStyles: StylesConfig<OptionType, true> = useMemo(() => ({
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: "#ffffff",
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--border))",
      borderRadius: "calc(var(--radius) - 2px)",
      minHeight: "2.5rem",
      boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring))" : "none",
      "&:hover": {
        borderColor: "hsl(var(--ring))",
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#ffffff",
      border: "1px solid hsl(var(--border))",
      borderRadius: "calc(var(--radius) - 2px)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "hsl(var(--primary))"
        : state.isFocused
        ? "hsl(var(--accent))"
        : "#ffffff",
      color: state.isSelected ? "hsl(var(--primary-foreground))" : "#000000",
      "&:active": {
        backgroundColor: "hsl(var(--accent))",
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#e5e7eb",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#000000",
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#000000",
      "&:hover": {
        backgroundColor: "hsl(var(--destructive))",
        color: "#ffffff",
      },
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#6b7280",
    }),
    input: (base: any) => ({
      ...base,
      color: "#000000",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#000000",
    }),
  }), [])

  // Enroll student mutation
  const enrollStudentMutation = useMutation({
    mutationFn: ({ userId, courseId }: { userId: string; courseId: string }) => enrollStudent(userId, courseId),
    onError: (error) => {
      console.error("Error enrolling student:", error)
    },
  })

  // Copy course mutation
  const copyCourseMutation = useMutation({
    mutationFn: ({ courseId, organizationId }: { courseId: string; organizationId: string }) =>
      copyCourse(courseId, organizationId),
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Course added to organization", {
          description: `"${response.data.title}" has been added to your organization.`,
        })
        queryClient.invalidateQueries({ queryKey: ["courses", organizationId] })
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : response.error?.message || "Failed to add course"
        toast.error("Failed to add course", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error copying course:", error)
      const errorMessage = typeof error?.message === 'string'
        ? error.message
        : "Failed to add course. Please try again."
      toast.error("Failed to add course", {
        description: errorMessage,
      })
    },
  })

  const handleCopyCourse = async (courseId: string) => {
    if (!organizationId) {
      toast.error("Error", {
        description: "Organization ID not found",
      })
      return
    }
    copyCourseMutation.mutate({ courseId, organizationId })
    // Close preview if open
    setOpenPreview(false)
    setPreviewCourse(null)
  }

  const handlePreviewCourse = (course: CourseWithRelations) => {
    setPreviewCourse(course)
    setOpenPreview(true)
  }

  const handleOpenEnroll = (course: CourseWithRelations) => {
    setSelectedCourse(course)
    setSelectedMembers([])
    setEnrollError(null)
    setOpenEnroll(true)
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnrollError(null)

    if (!selectedCourse) {
      const errorMsg = "No course selected"
      setEnrollError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    if (selectedMembers.length === 0) {
      const errorMsg = "Please select at least one student"
      setEnrollError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    try {
      // Enroll all selected members
      const enrollments = await Promise.allSettled(
        selectedMembers.map((userId) =>
          enrollStudentMutation.mutateAsync({
            userId,
            courseId: selectedCourse.id,
          })
        )
      )

      // Check for any failures
      const failures = enrollments.filter(
        (result) =>
          result.status === "rejected" ||
          (result.status === "fulfilled" && (result.value.error || result.value.validationErrors || !result.value.data))
      )
      const successful = enrollments.filter(
        (result) =>
          result.status === "fulfilled" && result.value.data && !result.value.error && !result.value.validationErrors
      )

      if (failures.length > 0 && successful.length === 0) {
        const errorMessages = failures
          .map((f) => {
            if (f.status === "rejected") return f.reason?.message || "Unknown error"
            return f.value.error?.message || f.value.validationErrors?.[0]?.message || "Failed to enroll"
          })
          .join(", ")
        setEnrollError(`Failed to enroll: ${errorMessages}`)
        toast.error("Enrollment failed", {
          description: errorMessages,
        })
      } else if (failures.length > 0) {
        const message = `Successfully enrolled ${successful.length} student(s). ${failures.length} enrollment(s) failed.`
        setEnrollError(message)
        toast.success("Partially enrolled", {
          description: message,
        })
        // Invalidate courses query to refresh student count
        queryClient.invalidateQueries({ queryKey: ["courses", organizationId] })
        // Close dialog after a short delay if some succeeded
        setTimeout(() => {
          setOpenEnroll(false)
          setSelectedCourse(null)
          setSelectedMembers([])
        }, 2000)
      } else {
        // All successful
        toast.success("Enrollment successful", {
          description: `Successfully enrolled ${successful.length} student(s) to ${selectedCourse?.title || "the course"}.`,
        })
        queryClient.invalidateQueries({ queryKey: ["courses", organizationId] })
        setOpenEnroll(false)
        setSelectedCourse(null)
        setSelectedMembers([])
      }
    } catch (error: any) {
      console.error("Error enrolling students:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : "Failed to enroll students. Please try again."
      setEnrollError(errorMessage)
      toast.error("Failed to enroll students", {
        description: errorMessage,
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Courses</h1>
            <p className="text-muted-foreground">Manage and create courses for your organization</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/org/course/resource/upload">
                <Plus size={16} className="mr-2" />
                Upload Resource
              </Link>
            </Button>
            <Button asChild>
              <Link href="/org/course/create">
                <Plus size={16} className="mr-2" />
                Create Course
              </Link>
            </Button>
          </div>
        </div>

        {/* Default Courses Section */}
        {defaultCourses.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Default Courses</h2>
                <p className="text-sm text-muted-foreground">
                  Add pre-built courses to your organization. These courses are available to all organizations.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {isLoadingDefaultCourses ? (
                  <div className="col-span-2 flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading default courses...</span>
                  </div>
                ) : (
                  defaultCourses.map((course) => (
                    <Card key={course.id} className="border-border/40">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-foreground">{course.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {course.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                              {course.lessons?.length || 0} lessons
                              {course.quizzes && (course.quizzes as any[]).length > 0 && (
                                <> • {(course.quizzes as any[]).length} quiz{(course.quizzes as any[]).length !== 1 ? "zes" : ""}</>
                              )}
                            </span>
                            <Badge variant="outline">{course.level}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handlePreviewCourse(course)}
                              variant="outline"
                              className="flex-1"
                            >
                              <Eye size={16} className="mr-2" />
                              Preview
                            </Button>
                            <Button
                              onClick={() => handleCopyCourse(course.id)}
                              disabled={copyCourseMutation.isPending}
                              className="flex-1"
                            >
                              {copyCourseMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Download size={16} className="mr-2" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Courses Section */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Your Courses</h2>
          <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead>Title</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading courses...</p>
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-destructive">
                      {coursesResponse?.error?.message || "Failed to load courses. Please try again."}
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && courses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No courses found. Create your first course to get started.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && courses.map((course) => (
                  <TableRow 
                    key={course.id} 
                    className="border-border/40 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => router.push(`/org/course/${course.id}`)}
                  >
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell>{course.enrollments?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={course.status === "published" ? "default" : "secondary"}>
                        {course.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(course.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/org/course/${course.id}`}>
                              <Eye size={16} className="mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEnroll(course)}>
                            <UserPlus size={16} className="mr-2" />
                            Enroll Student
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/org/course/${course.id}/edit`}>
                              <Edit2 size={16} className="mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 size={16} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>

        {/* Course Preview Dialog */}
        <Dialog open={openPreview} onOpenChange={setOpenPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Course Preview</DialogTitle>
              <DialogDescription>
                Review the course content before adding it to your organization
              </DialogDescription>
            </DialogHeader>
            {previewCourse && (
              <div className="space-y-6">
                {/* Course Header */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">{previewCourse.title}</h2>
                  <p className="text-muted-foreground">{previewCourse.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{previewCourse.level}</Badge>
                    <Badge variant="secondary">{previewCourse.status}</Badge>
                  </div>
                </div>

                {/* Lessons Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileText size={18} />
                    Lessons ({previewCourse.lessons?.length || 0})
                  </h3>
                  {previewCourse.lessons && (previewCourse.lessons as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(previewCourse.lessons as any[]).map((lesson: any, index: number) => (
                        <Card key={lesson.id || index} className="border-border/40">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Lesson {lesson.order + 1}
                                  </span>
                                  {lesson.duration && (
                                    <span className="text-xs text-muted-foreground">
                                      • {lesson.duration} min
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-foreground">{lesson.title}</h4>
                                {lesson.content && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {lesson.content.replace(/[#*`]/g, "").substring(0, 150)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No lessons available</p>
                  )}
                </div>

                {/* Quizzes Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle size={18} />
                    Quizzes ({previewCourse.quizzes?.length || 0})
                  </h3>
                  {previewCourse.quizzes && (previewCourse.quizzes as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(previewCourse.quizzes as any[]).map((quiz: any, index: number) => (
                        <Card key={quiz.id || index} className="border-border/40">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{quiz.title}</h4>
                                {quiz.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {quiz.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>
                                    {quiz.questions?.length || 0} question{(quiz.questions?.length || 0) !== 1 ? "s" : ""}
                                  </span>
                                  <span>• Passing Score: {quiz.passingScore}%</span>
                                  <span>• Total Points: {quiz.totalPoints}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No quizzes available</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setOpenPreview(false)
                      setPreviewCourse(null)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handleCopyCourse(previewCourse.id)}
                    disabled={copyCourseMutation.isPending}
                    className="flex-1"
                  >
                    {copyCourseMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Download size={16} className="mr-2" />
                        Add to Organization
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Enroll Student Dialog */}
        <Dialog open={openEnroll} onOpenChange={setOpenEnroll}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Students in Course</DialogTitle>
              <DialogDescription>
                Select students to enroll in <strong>{selectedCourse?.title}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEnroll} className="space-y-4">
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    No members available. Invite members to your organization first.
                  </p>
                </div>
              ) : (
                <ReactSelect
                  isMulti
                  options={memberOptions}
                  value={selectedMemberOptions}
                  onChange={(newValue: MultiValue<{ value: string; label: string; member: OrganizationMember }>) => {
                    setSelectedMembers(newValue ? newValue.map((option: { value: string; label: string; member: OrganizationMember }) => option.value) : [])
                  }}
                  styles={selectStyles}
                  placeholder="Select students..."
                  isClearable
                  isSearchable
                  className="react-select-container"
                  classNamePrefix="react-select"
                />
              )}

              {enrollError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{enrollError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={enrollStudentMutation.isPending || selectedMembers.length === 0 || membersLoading}
                >
                  {enrollStudentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    `Enroll ${selectedMembers.length} Student${selectedMembers.length !== 1 ? "s" : ""}`
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenEnroll(false)
                    setSelectedCourse(null)
                    setSelectedMembers([])
                    setEnrollError(null)
                  }}
                  disabled={enrollStudentMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
