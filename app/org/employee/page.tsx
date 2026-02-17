"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Mail, Trash2, Loader2, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ReactSelect from "react-select"
import type { StylesConfig, MultiValue } from "react-select"
import { inviteMember, getOrganizationMembers, getCourses, enrollStudent, type OrganizationMember, type CourseWithRelations } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getUserFullName } from "@/lib/utils/user"

export default function EmployeePage() {
  const queryClient = useQueryClient()
  const [openInvite, setOpenInvite] = useState(false)
  const [openEnroll, setOpenEnroll] = useState(false)
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [inviteData, setInviteData] = useState({ email: "", role: "member" as "admin" | "member" | "instructor" })
  const [error, setError] = useState<string | null>(null)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  // Fetch organization members
  const { data: membersResponse, isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId),
    enabled: !!organizationId,
  })

  // Fetch courses for enrollment
  const { data: coursesResponse, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", organizationId],
    queryFn: () => getCourses(organizationId),
    enabled: !!organizationId && openEnroll,
  })

  const employees = membersResponse?.data || []
  const courses = coursesResponse?.data || []

  // Prepare options for react-select
  const courseOptions = useMemo(() => {
    return courses.map((course: CourseWithRelations) => ({
      value: course.id,
      label: `${course.title} (${course.status})`,
      course: course,
    }))
  }, [courses])

  // Get selected options from selectedCourses array
  const selectedCourseOptions = useMemo(() => {
    return courseOptions.filter((option) => selectedCourses.includes(option.value))
  }, [courseOptions, selectedCourses])

  // Custom styles for react-select to match app theme
  type OptionType = { value: string; label: string; course: CourseWithRelations }
  const selectStyles: StylesConfig<OptionType, true> = useMemo(() => ({
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: "#ffffff",
      borderColor: state.isFocused ? "#65B32E" : "rgba(101, 179, 46, 0.2)",
      borderRadius: "calc(var(--radius) - 2px)",
      minHeight: "2.5rem",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(101, 179, 46, 0.2)" : "none",
      "&:hover": {
        borderColor: "#65B32E",
      },
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#ffffff",
      border: "1px solid rgba(101, 179, 46, 0.2)",
      borderRadius: "calc(var(--radius) - 2px)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#65B32E"
        : state.isFocused
        ? "rgba(101, 179, 46, 0.1)"
        : "#ffffff",
      color: state.isSelected ? "#ffffff" : "#000000",
      "&:active": {
        backgroundColor: "rgba(101, 179, 46, 0.1)",
      },
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "rgba(101, 179, 46, 0.1)",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#65B32E",
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#65B32E",
      "&:hover": {
        backgroundColor: "#DE1915",
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

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: (response) => {
      if (response.data) {
        // Reset form and close dialog
        setInviteData({ email: "", role: "member" })
        setOpenInvite(false)
        setError(null)
        // Invalidate queries to refetch members list
        queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] })
        toast.success("Invitation sent successfully", {
          description: `An invitation has been sent to ${inviteData.email}.`,
        })
      } else if (response.error) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : response.error?.message || "Failed to invite member"
        setError(errorMsg)
        toast.error("Failed to invite member", {
          description: errorMsg,
        })
      } else if (response.validationErrors) {
        const firstError = response.validationErrors[0]
        const errorMsg = firstError?.message || "Validation error"
        setError(errorMsg)
        toast.error("Validation error", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error inviting member:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : typeof error?.error === 'string'
        ? error.error
        : "Failed to invite member. Please try again."
      setError(errorMessage)
      toast.error("Failed to invite member", {
        description: errorMessage,
      })
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!organizationId) {
      setError("Organization ID is required")
      return
    }

    // Map UI role to API role (UI uses uppercase, API uses lowercase)
    const apiRole = inviteData.role.toLowerCase() as "admin" | "member" | "instructor"

    inviteMemberMutation.mutate({
      organizationId,
      email: inviteData.email,
      role: apiRole,
    })
  }

  // Enroll student mutation
  const enrollStudentMutation = useMutation({
    mutationFn: ({ userId, courseId }: { userId: string; courseId: string }) => enrollStudent(userId, courseId),
    onError: (error) => {
      console.error("Error enrolling student:", error)
    },
  })

  const handleOpenEnroll = (member: OrganizationMember) => {
    setSelectedMember(member)
    setSelectedCourses([])
    setEnrollError(null)
    setOpenEnroll(true)
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnrollError(null)

    if (!selectedMember) {
      const errorMsg = "No member selected"
      setEnrollError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    if (selectedCourses.length === 0) {
      const errorMsg = "Please select at least one course"
      setEnrollError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    try {
      // Enroll in all selected courses
      const enrollments = await Promise.allSettled(
        selectedCourses.map((courseId) =>
          enrollStudentMutation.mutateAsync({
            userId: selectedMember.userId,
            courseId,
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
        const message = `Successfully enrolled in ${successful.length} course(s). ${failures.length} enrollment(s) failed.`
        setEnrollError(message)
        toast.success("Partially enrolled", {
          description: message,
        })
        // Close dialog after a short delay if some succeeded
        setTimeout(() => {
          setOpenEnroll(false)
          setSelectedMember(null)
          setSelectedCourses([])
        }, 2000)
      } else {
        // All successful
        toast.success("Enrollment successful", {
          description: `Successfully enrolled ${getUserFullName(selectedMember?.firstName, selectedMember?.lastName, selectedMember?.name) || selectedMember?.email || "student"} in ${successful.length} course(s).`,
        })
        setOpenEnroll(false)
        setSelectedMember(null)
        setSelectedCourses([])
      }
    } catch (error: any) {
      console.error("Error enrolling student:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : "Failed to enroll student. Please try again."
      setEnrollError(errorMessage)
      toast.error("Failed to enroll student", {
        description: errorMessage,
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#65B32E]">Team Members</h1>
            <p className="text-muted-foreground">Manage your team and assign roles</p>
          </div>
          <Dialog open={openInvite} onOpenChange={setOpenInvite}>
            <DialogTrigger asChild>
              <Button className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white">
                <Mail size={16} className="mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-[#65B32E]/20">
              <DialogHeader>
                <DialogTitle className="text-[#65B32E]">Invite Team Member</DialogTitle>
                <DialogDescription>Add a new member to your organization</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#65B32E]">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteData.email}
                    onChange={(e) => setInviteData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="border-[#65B32E]/30 focus:border-[#65B32E]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[#65B32E]">Role</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(value) => setInviteData((prev) => ({ ...prev, role: value as "admin" | "member" | "instructor" }))}
                  >
                    <SelectTrigger className="border-[#65B32E]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#65B32E]/20">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="instructor">Instructor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <div className="p-3 bg-[#DE1915]/10 border border-[#DE1915]/20 rounded-md">
                    <p className="text-sm text-[#DE1915]">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full bg-[#65B32E] hover:bg-[#65B32E]/90 text-white" disabled={inviteMemberMutation.isPending || !organizationId}>
                  {inviteMemberMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Invite...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Enroll Student Dialog */}
          <Dialog open={openEnroll} onOpenChange={setOpenEnroll}>
            <DialogContent className="bg-white border-[#65B32E]/20">
              <DialogHeader>
                <DialogTitle className="text-[#65B32E]">Enroll Student in Courses</DialogTitle>
                <DialogDescription>
                  Select courses to enroll {getUserFullName(selectedMember?.firstName, selectedMember?.lastName, selectedMember?.name) || selectedMember?.email || "this member"} into
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEnroll} className="space-y-4">
                {coursesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#65B32E]" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading courses...</span>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      No courses available. Create a course first to enroll students.
                    </p>
                  </div>
                ) : (
                  <ReactSelect
                    isMulti
                    options={courseOptions}
                    value={selectedCourseOptions}
                    onChange={(newValue: MultiValue<{ value: string; label: string; course: CourseWithRelations }>) => {
                      setSelectedCourses(newValue ? newValue.map((option: { value: string; label: string; course: CourseWithRelations }) => option.value) : [])
                    }}
                    styles={selectStyles}
                    placeholder="Select courses..."
                    isClearable
                    isSearchable
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                )}

                {enrollError && (
                  <div className="p-3 bg-[#DE1915]/10 border border-[#DE1915]/20 rounded-md">
                    <p className="text-sm text-[#DE1915]">{enrollError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
                    disabled={enrollStudentMutation.isPending || selectedCourses.length === 0 || coursesLoading}
                  >
                    {enrollStudentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      `Enroll in ${selectedCourses.length} Course${selectedCourses.length !== 1 ? "s" : ""}`
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenEnroll(false)
                      setSelectedMember(null)
                      setSelectedCourses([])
                      setEnrollError(null)
                    }}
                    disabled={enrollStudentMutation.isPending}
                    className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-[#65B32E]/20 bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#65B32E]/20 hover:bg-transparent">
                  <TableHead className="text-[#65B32E]">Name</TableHead>
                  <TableHead className="text-[#65B32E]">Email</TableHead>
                  <TableHead className="text-[#65B32E]">Job Title</TableHead>
                  <TableHead className="text-[#65B32E]">Department</TableHead>
                  <TableHead className="text-[#65B32E]">Role</TableHead>
                  <TableHead className="text-[#65B32E]">Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#65B32E]" />
                      <p className="text-sm text-muted-foreground mt-2">Loading members...</p>
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No members yet. Invite your first team member to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee: OrganizationMember) => (
                    <TableRow key={employee.id} className="border-[#65B32E]/20 hover:bg-[#65B32E]/5">
                      <TableCell className="font-medium text-[#65B32E]">
                        {getUserFullName(employee.firstName, employee.lastName, employee.name)}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.jobTitle || "N/A"}</TableCell>
                      <TableCell>{employee.department || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase border-[#65B32E]/30">{employee.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-[#65B32E] text-white">Active</Badge>
                      </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="hover:bg-[#65B32E]/10">
                            <MoreHorizontal size={16} className="text-[#65B32E]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-[#65B32E]/20">
                          <DropdownMenuItem onClick={() => handleOpenEnroll(employee)} className="hover:bg-[#65B32E]/10 text-[#65B32E]">
                            <UserPlus size={16} className="mr-2" />
                            Enroll Student
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-[#DE1915] hover:bg-[#DE1915]/10">
                            <Trash2 size={16} className="mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
