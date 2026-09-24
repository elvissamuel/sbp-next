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
import { MoreHorizontal, Plus, Edit2, Eye, Trash2, Loader2, UserPlus, Download, FileText, HelpCircle, Building2 } from "lucide-react"
import { getCourses, getOrganizationMembers, getDepartments, enrollStudent, enrollDepartmentToCourse, deleteCourse, getDefaultCourses, copyCourse, type CourseWithRelations, type OrganizationMember, type Department } from "@/lib/api-calls"
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
import { getUserFullName } from "@/lib/utils/user"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CourseManagementPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  // Get primary organization from session
  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  const [openEnroll, setOpenEnroll] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<CourseWithRelations | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [openPreview, setOpenPreview] = useState(false)
  const [previewCourse, setPreviewCourse] = useState<CourseWithRelations | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<CourseWithRelations | null>(null)

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

  const { data: departmentsResponse, isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments", organizationId],
    queryFn: () => getDepartments(organizationId),
    enabled: !!organizationId && openEnroll,
  })

  // Fetch default courses
  const { data: defaultCoursesResponse, isLoading: isLoadingDefaultCourses } = useQuery({
    queryKey: ["default-courses"],
    queryFn: () => getDefaultCourses(),
  })

  const courses = coursesResponse?.data || []
  const members = membersResponse?.data || []
  const departments = departmentsResponse?.data || []
  const defaultCourses = defaultCoursesResponse?.data || []

  const { data: subscriptionCheck } = useQuery({
    queryKey: ["subscription-check", organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/check?organizationId=${organizationId}`)
      return res.json()
    },
    enabled: !!organizationId,
  })

  const isFreePlan = subscriptionCheck?.subscription?.plan === "free"
  const freeCourseLimitReached = isFreePlan && courses.length >= 2

  // Prepare options for react-select
  const memberOptions = useMemo(() => {
    return members.map((member: OrganizationMember) => ({
      value: member.userId,
      label: `${getUserFullName(member.firstName, member.lastName, member.name) || "N/A"} (${member.email}) - ${member.role}`,
      member: member,
    }))
  }, [members])

  // Get selected options from selectedMembers array
  const selectedMemberOptions = useMemo(() => {
    return memberOptions.filter((option) => selectedMembers.includes(option.value))
  }, [memberOptions, selectedMembers])

  const departmentOptions = useMemo(() => {
    return departments.map((department: Department) => ({
      value: department.id,
      label: department.name,
    }))
  }, [departments])

  const selectedDepartmentOptions = useMemo(() => {
    return departmentOptions.filter((option) => selectedDepartments.includes(option.value))
  }, [departmentOptions, selectedDepartments])

  // Custom styles for react-select to match app theme
  type OptionType = { value: string; label: string }
  const selectStyles: StylesConfig<OptionType, true> = useMemo(() => ({
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: "#ffffff",
      borderColor: state.isFocused ? "var(--org-primary)" : "rgb(var(--org-primary-rgb) / 0.2)",
      borderRadius: "calc(var(--radius) - 2px)",
      minHeight: "2.5rem",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(1, 64, 46, 0.2)" : "none",
      "&:hover": {
        borderColor: "var(--org-primary)",
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#ffffff",
      border: "1px solid rgba(1, 64, 46, 0.2)",
      borderRadius: "calc(var(--radius) - 2px)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "var(--org-primary)"
        : state.isFocused
        ? "rgba(1, 64, 46, 0.1)"
        : "#ffffff",
      color: state.isSelected ? "#ffffff" : "#000000",
      "&:active": {
        backgroundColor: "rgba(1, 64, 46, 0.1)",
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "rgba(1, 64, 46, 0.1)",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "var(--org-primary)",
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "var(--org-primary)",
      "&:hover": {
        backgroundColor: "var(--org-accent)",
        color: "#ffffff",
      },
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#000000",
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
    setSelectedDepartments([])
    setEnrollError(null)
    setOpenEnroll(true)
  }

  const resetEnrollDialog = () => {
    setOpenEnroll(false)
    setSelectedCourse(null)
    setSelectedMembers([])
    setSelectedDepartments([])
    setEnrollError(null)
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

    if (selectedMembers.length === 0 && selectedDepartments.length === 0) {
      const errorMsg = "Select at least one student or department"
      setEnrollError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    try {
      setIsEnrolling(true)
      const departmentResults = await Promise.all(
        selectedDepartments.map(async (departmentId) => {
          const response = await enrollDepartmentToCourse(departmentId, selectedCourse.id)
          const departmentName = departments.find((department) => department.id === departmentId)?.name || "Department"
          return { departmentName, response }
        })
      )

      const departmentFailures = departmentResults.filter((result) => result.response.error || !result.response.data)
      const enrolledFromDepartments = departmentResults.reduce(
        (total, result) => total + (result.response.data?.enrolled || 0),
        0
      )
      const alreadyEnrolledFromDepartments = departmentResults.reduce(
        (total, result) => total + (result.response.data?.alreadyEnrolled || 0),
        0
      )

      const enrolledDepartmentUserIds = new Set(
        members
          .filter((member) =>
            selectedDepartments.some((departmentId) => {
              const department = departments.find((item) => item.id === departmentId)
              if (!department) return false
              if (member.departmentId) return member.departmentId === department.id
              return member.department?.trim().toLowerCase() === department.name.trim().toLowerCase()
            })
          )
          .map((member) => member.userId)
      )

      const individualUserIds = selectedMembers.filter((userId) => !enrolledDepartmentUserIds.has(userId))
      const individualResults = await Promise.all(
        individualUserIds.map((userId) =>
          enrollStudentMutation.mutateAsync({
            userId,
            courseId: selectedCourse.id,
          })
        )
      )

      const alreadyEnrolledIndividuals = individualResults.filter((result) =>
        result.error?.message?.toLowerCase().includes("already enrolled")
      ).length
      const individualFailures = individualResults.filter(
        (result) =>
          (result.error || result.validationErrors || !result.data) &&
          !result.error?.message?.toLowerCase().includes("already enrolled")
      )
      const enrolledIndividuals = individualResults.filter((result) => result.data && !result.error).length

      const enrolled = enrolledFromDepartments + enrolledIndividuals
      const alreadyEnrolled = alreadyEnrolledFromDepartments + alreadyEnrolledIndividuals
      const failureMessages = [
        ...departmentFailures.map(
          (result) => result.response.error?.message || `Failed to enroll ${result.departmentName}`
        ),
        ...individualFailures.map((result) => result.error?.message || result.validationErrors?.[0]?.message || "Failed to enroll"),
      ]

      queryClient.invalidateQueries({ queryKey: ["courses", organizationId] })

      if (enrolled === 0 && failureMessages.length > 0) {
        const errorMsg = failureMessages.join(", ")
        setEnrollError(errorMsg)
        toast.error("Enrollment failed", { description: errorMsg })
        return
      }

      if (enrolled === 0 && alreadyEnrolled > 0) {
        toast.success("Already enrolled", {
          description: `Everyone selected is already enrolled in ${selectedCourse.title}.`,
        })
        resetEnrollDialog()
        return
      }

      const description = [
        `Enrolled ${enrolled} ${enrolled === 1 ? "person" : "people"} in ${selectedCourse.title}.`,
        alreadyEnrolled > 0 ? `${alreadyEnrolled} ${alreadyEnrolled === 1 ? "was" : "were"} already enrolled.` : "",
        failureMessages.length > 0 ? failureMessages.join(", ") : "",
      ]
        .filter(Boolean)
        .join(" ")

      toast.success(failureMessages.length > 0 ? "Partially enrolled" : "Enrollment successful", {
        description,
      })
      resetEnrollDialog()
    } catch (error: any) {
      console.error("Error enrolling students:", error)
      const errorMessage = typeof error?.message === "string" ? error.message : "Failed to enroll. Please try again."
      setEnrollError(errorMessage)
      toast.error("Failed to enroll", {
        description: errorMessage,
      })
    } finally {
      setIsEnrolling(false)
    }
  }

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: (response) => {
      if (response.error || !response.data) {
        const message = response.error?.message || "Failed to delete course"
        toast.error("Failed to delete course", { description: message })
        return
      }
      toast.success("Course deleted", {
        description: `"${courseToDelete?.title || "Course"}" has been deleted.`,
      })
      queryClient.invalidateQueries({ queryKey: ["courses", organizationId] })
      setOpenDeleteDialog(false)
    },
    onError: (error: Error) => {
      toast.error("Failed to delete course", {
        description: error.message || "Please try again.",
      })
    },
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Courses</h1>
            <p className="text-black">Manage and create courses for your organization</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="border-primary/30 text-primary hover:bg-primary/10">
              <Link href="/org/course/resource">
                <Plus size={16} className="mr-2" />
                Update Library
              </Link>
            </Button>
            {freeCourseLimitReached ? (
              <Button
                type="button"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/5"
                onClick={() => {
                  toast.error("Free plan limit reached", {
                    description: "You can only create up to 2 courses on the Free plan. Upgrade to create more.",
                  })
                  router.push("/settings/subscription")
                }}
              >
                <Plus size={16} className="mr-2" />
                Create Course (limit reached)
              </Button>
            ) : (
              <>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                  <Link href="/org/course/create">
                    <Plus size={16} className="mr-2" />
                    Create Course
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/org/course/outline">Build from outline</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Default Courses Section */}
        {defaultCourses.length > 0 && (
          <Card className="border-primary/20 bg-white">
            <CardContent className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-primary">Default Courses</h2>
                <p className="text-sm text-black">
                  Add pre-built courses to your organization. These courses are available to all organizations.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {isLoadingDefaultCourses ? (
                  <div className="col-span-2 flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-black">Loading default courses...</span>
                  </div>
                ) : (
                  defaultCourses.map((course) => (
                    <Card key={course.id} className="border-primary/20 bg-white">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-primary">{course.title}</h3>
                            <p className="text-sm text-black line-clamp-2 mt-1">
                              {course.description}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-sm text-black">
                            <span>
                              {course.lessons?.length || 0} lessons
                              {course.quizzes && (course.quizzes as any[]).length > 0 && (
                                <> • {(course.quizzes as any[]).length} quiz{(course.quizzes as any[]).length !== 1 ? "zes" : ""}</>
                              )}
                            </span>
                            <Badge variant="outline" className="border-primary/30">{course.level}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handlePreviewCourse(course)}
                              variant="outline"
                              className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                            >
                              <Eye size={16} className="mr-2" />
                              Preview
                            </Button>
                            <Button
                              onClick={() => handleCopyCourse(course.id)}
                              disabled={copyCourseMutation.isPending || freeCourseLimitReached}
                              className="flex-1 bg-primary hover:bg-primary/90 text-white"
                            >
                              {copyCourseMutation.isPending ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Download size={16} className="mr-2" />
                                  {freeCourseLimitReached ? "Limit reached" : "Add"}
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
          <h2 className="text-xl font-semibold text-primary mb-4">Your Courses</h2>
          <Card className="border-primary/20 bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20 hover:bg-transparent">
                  <TableHead className="text-primary">Title</TableHead>
                  <TableHead className="text-primary">Modules</TableHead>
                  <TableHead className="text-primary">Students</TableHead>
                  <TableHead className="text-primary">Status</TableHead>
                  <TableHead className="text-primary">Created</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-black mt-2">Loading courses...</p>
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-destructive">
                      {coursesResponse?.error?.message || "Failed to load courses. Please try again."}
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && courses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-black">
                      No courses found. Create your first course to get started.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !error && courses.map((course) => (
                  <TableRow 
                    key={course.id} 
                    className="border-primary/20 cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => router.push(`/org/course/${course.id}`)}
                  >
                    <TableCell className="font-medium text-primary">{course.title}</TableCell>
                    <TableCell>{course._count?.modules ?? course.modules?.length ?? 0}</TableCell>
                    <TableCell>{course.enrollments?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={course.status === "published" ? "default" : "secondary"} className={course.status === "published" ? "bg-primary text-white" : ""}>
                        {course.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-black">
                      {format(new Date(course.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                            <MoreHorizontal size={16} className="text-primary" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-primary/20">
                          <DropdownMenuItem asChild className="hover:bg-primary/10">
                            <Link href={`/org/course/${course.id}`} className="text-primary">
                              <Eye size={16} className="mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEnroll(course)} className="hover:bg-primary/10 text-primary">
                            <UserPlus size={16} className="mr-2" />
                            Enroll Student
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-primary/10">
                            <Link href={`/org/course/${course.id}/edit`} className="text-primary">
                              <Edit2 size={16} className="mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setCourseToDelete(course)
                              setOpenDeleteDialog(true)
                            }}
                          >
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-primary">Course Preview</DialogTitle>
              <DialogDescription>
                Review the course content before adding it to your organization
              </DialogDescription>
            </DialogHeader>
            {previewCourse && (
              <div className="space-y-6">
                {/* Course Header */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-primary">{previewCourse.title}</h2>
                  <p className="text-black">{previewCourse.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/30">{previewCourse.level}</Badge>
                    <Badge variant="secondary">{previewCourse.status}</Badge>
                  </div>
                </div>

                {/* Lessons Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <FileText size={18} />
                    Lessons ({previewCourse.lessons?.length || 0})
                  </h3>
                  {previewCourse.lessons && (previewCourse.lessons as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(previewCourse.lessons as any[]).map((lesson: any, index: number) => (
                        <Card key={lesson.id || index} className="border-primary/20 bg-white">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-black">
                                    Lesson {lesson.order + 1}
                                  </span>
                                  {lesson.duration && (
                                    <span className="text-xs text-black">
                                      • {lesson.duration} min
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-primary">{lesson.title}</h4>
                                {lesson.content && (
                                  <p className="text-sm text-black mt-2 line-clamp-2">
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
                    <p className="text-sm text-black">No lessons available</p>
                  )}
                </div>

                {/* Quizzes Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <HelpCircle size={18} />
                    Quizzes ({previewCourse.quizzes?.length || 0})
                  </h3>
                  {previewCourse.quizzes && (previewCourse.quizzes as any[]).length > 0 ? (
                    <div className="space-y-2">
                      {(previewCourse.quizzes as any[]).map((quiz: any, index: number) => (
                        <Card key={quiz.id || index} className="border-primary/20 bg-white">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-primary">{quiz.title}</h4>
                                {quiz.description && (
                                  <p className="text-sm text-black mt-1">
                                    {quiz.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-black">
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
                    <p className="text-sm text-black">No quizzes available</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-primary/20">
                  <Button
                    onClick={() => {
                      setOpenPreview(false)
                      setPreviewCourse(null)
                    }}
                    variant="outline"
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handleCopyCourse(previewCourse.id)}
                    disabled={copyCourseMutation.isPending}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
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
          <DialogContent className="bg-white border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-primary">Enroll in Course</DialogTitle>
              <DialogDescription>
                Enroll students or a whole department in <strong>{selectedCourse?.title}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEnroll} className="space-y-4">
              {membersLoading || departmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-black">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-primary">Students</Label>
                    {members.length === 0 ? (
                      <p className="text-sm text-black">No members available. Invite members to your organization first.</p>
                    ) : (
                      <ReactSelect
                        isMulti
                        options={memberOptions}
                        value={selectedMemberOptions}
                        onChange={(newValue: MultiValue<{ value: string; label: string }>) => {
                          setSelectedMembers(newValue ? newValue.map((option) => option.value) : [])
                        }}
                        styles={selectStyles}
                        placeholder="Select students..."
                        isClearable
                        isSearchable
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-primary flex items-center gap-2">
                      <Building2 size={14} />
                      Departments
                    </Label>
                    {departments.length === 0 ? (
                      <p className="text-sm text-black">No departments yet.</p>
                    ) : (
                      <ReactSelect
                        isMulti
                        options={departmentOptions}
                        value={selectedDepartmentOptions}
                        onChange={(newValue: MultiValue<{ value: string; label: string }>) => {
                          setSelectedDepartments(newValue ? newValue.map((option) => option.value) : [])
                        }}
                        styles={selectStyles}
                        placeholder="Select departments..."
                        isClearable
                        isSearchable
                        className="react-select-container"
                        classNamePrefix="react-select"
                      />
                    )}
                    <p className="text-xs text-black">Everyone in a selected department will be enrolled.</p>
                  </div>
                </>
              )}

              {enrollError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{enrollError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  disabled={
                    isEnrolling ||
                    (selectedMembers.length === 0 && selectedDepartments.length === 0) ||
                    membersLoading ||
                    departmentsLoading
                  }
                >
                  {isEnrolling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    "Enroll"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetEnrollDialog}
                  disabled={isEnrolling}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={openDeleteDialog}
          onOpenChange={(open) => {
            if (!deleteCourseMutation.isPending) setOpenDeleteDialog(open)
          }}
        >
          <AlertDialogContent className="bg-white border-destructive/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Delete course?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete <span className="font-semibold">{courseToDelete?.title || "this course"}</span>? This removes the
                course and its lessons, quizzes, and enrollments. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteCourseMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                disabled={deleteCourseMutation.isPending || !courseToDelete}
                onClick={(event) => {
                  event.preventDefault()
                  if (courseToDelete) deleteCourseMutation.mutate(courseToDelete.id)
                }}
              >
                {deleteCourseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
