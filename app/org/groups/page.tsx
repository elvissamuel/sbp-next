"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Select from "react-select"
import type { StylesConfig, MultiValue } from "react-select"
import Link from "next/link"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select as SelectComponent, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Plus, Edit2, Trash2, Loader2, BookOpen } from "lucide-react"
import { getGroups, createGroup, getOrganizationMembers, getCourses, enrollGroupToCourse, type Group, type OrganizationMember, type CourseWithRelations } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getUserFullName } from "@/lib/utils/user"

export default function GroupsPage() {
  const queryClient = useQueryClient()
  const [openCreate, setOpenCreate] = useState(false)
  const [openEnroll, setOpenEnroll] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [groupName, setGroupName] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]) // Array of userId
  const [error, setError] = useState<string | null>(null)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  // Fetch groups
  const { data: groupsResponse, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups", organizationId],
    queryFn: () => getGroups(organizationId),
    enabled: !!organizationId,
  })

  // Fetch organization members
  const { data: membersResponse, isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId),
    enabled: !!organizationId && openCreate,
  })

  // Fetch courses for enrollment
  const { data: coursesResponse, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", organizationId],
    queryFn: () => getCourses(organizationId),
    enabled: !!organizationId && openEnroll,
  })

  const courses = coursesResponse?.data || []

  const groups = groupsResponse?.data || []
  const members = membersResponse?.data || []

  // Prepare options for react-select
  const memberOptions = useMemo(() => {
    return members.map((member: OrganizationMember) => ({
      value: member.userId,
      label: `${getUserFullName(member.firstName, member.lastName, member.name) || member.email} (${member.role})`,
      member: member,
    }))
  }, [members])

  // Get selected options from selectedMembers array
  const selectedOptions = useMemo(() => {
    return memberOptions.filter((option) => selectedMembers.includes(option.value))
  }, [memberOptions, selectedMembers])

  // Custom styles for react-select to match app theme
  type OptionType = { value: string; label: string; member: OrganizationMember }
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

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: { organizationId: string; name: string; memberIds?: string[] }) => createGroup(data),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["groups", organizationId] })
        setOpenCreate(false)
        setGroupName("")
        setSelectedMembers([])
        setError(null)
        toast.success("Group created successfully", {
          description: `The group "${response.data.name}" has been created.`,
        })
      } else {
        const errorMsg = typeof response.error === 'string' ? response.error : "An error occurred while creating the group."
        toast.error("Failed to create group", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error creating group:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : typeof error?.error === 'string'
        ? error.error
        : "Failed to create group. Please try again."
      setError(errorMessage)
      toast.error("Failed to create group", {
        description: errorMessage,
      })
    },
  })

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!groupName.trim()) {
      const errorMsg = "Group name is required"
      setError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    createGroupMutation.mutate({
      organizationId,
      name: groupName.trim(),
      memberIds: selectedMembers,
    })
  }

  const handleOpenCreate = () => {
    setOpenCreate(true)
    setGroupName("")
    setSelectedMembers([])
    setError(null)
  }

  const handleOpenEnroll = (group: Group) => {
    setSelectedGroup(group)
    setSelectedCourseId("")
    setEnrollError(null)
    setOpenEnroll(true)
  }

  // Enroll group to course mutation
  const enrollGroupMutation = useMutation({
    mutationFn: ({ groupId, courseId }: { groupId: string; courseId: string }) => enrollGroupToCourse(groupId, courseId),
    onSuccess: (response) => {
      if (response.data) {
        const { enrolled, alreadyEnrolled, totalMembers } = response.data
        setOpenEnroll(false)
        setSelectedGroup(null)
        setSelectedCourseId("")
        setEnrollError(null)
        
        if (alreadyEnrolled > 0 && enrolled > 0) {
          toast.success("Group partially enrolled", {
            description: `Successfully enrolled ${enrolled} member(s) to the course. ${alreadyEnrolled} member(s) were already enrolled.`,
          })
        } else if (enrolled > 0) {
          toast.success("Group enrolled successfully", {
            description: `All ${enrolled} member(s) have been enrolled to the course.`,
          })
        } else {
          toast.info("No new enrollments", {
            description: `All ${totalMembers} member(s) are already enrolled in this course.`,
          })
        }
      } else {
        const errorMsg = typeof response.error === 'string' ? response.error : "An error occurred while enrolling the group."
        setEnrollError(errorMsg)
        toast.error("Failed to enroll group", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error enrolling group:", error)
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : typeof error?.error === 'string'
        ? error.error
        : "Failed to enroll group to course. Please try again."
      setEnrollError(errorMessage)
      toast.error("Failed to enroll group", {
        description: errorMessage,
      })
    },
  })

  const handleEnrollGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnrollError(null)

    if (!selectedGroup) {
      const errorMsg = "No group selected"
      setEnrollError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    if (!selectedCourseId) {
      const errorMsg = "Please select a course"
      setEnrollError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    enrollGroupMutation.mutate({
      groupId: selectedGroup.id,
      courseId: selectedCourseId,
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#65B32E]">Groups</h1>
            <p className="text-muted-foreground">Organize students into learning groups</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white">
                <Plus size={16} className="mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-[#65B32E]/20">
              <DialogHeader>
                <DialogTitle className="text-[#65B32E]">Create New Group</DialogTitle>
                <DialogDescription>Create a new group and add organization members to it</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-[#65B32E]">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Web Development Cohort"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    className="border-[#65B32E]/30 focus:border-[#65B32E]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#65B32E]">Select Members</Label>
                  {membersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#65B32E]" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        No members available in your organization. Invite members first.
                      </p>
                    </div>
                  ) : (
                    <Select
                      isMulti
                      options={memberOptions}
                      value={selectedOptions}
                      onChange={(newValue: MultiValue<{ value: string; label: string; member: OrganizationMember }>) => {
                        setSelectedMembers(newValue ? newValue.map((option: { value: string; label: string; member: OrganizationMember }) => option.value) : [])
                      }}
                      styles={selectStyles}
                      placeholder="Select members..."
                      isClearable
                      isSearchable
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-[#DE1915]/10 border border-[#DE1915]/20 rounded-md">
                    <p className="text-sm text-[#DE1915]">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
                    disabled={createGroupMutation.isPending || membersLoading}
                  >
                    {createGroupMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Group"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenCreate(false)
                      setGroupName("")
                      setSelectedMembers([])
                      setError(null)
                    }}
                    className="flex-1 border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Enroll Group to Course Dialog */}
          <Dialog open={openEnroll} onOpenChange={setOpenEnroll}>
            <DialogContent className="bg-white border-[#65B32E]/20">
              <DialogHeader>
                <DialogTitle className="text-[#65B32E]">Enroll Group to Course</DialogTitle>
                <DialogDescription>
                  Enroll all members of "{selectedGroup?.name}" to a course
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEnrollGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course" className="text-[#65B32E]">Select Course</Label>
                  {coursesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-[#65B32E]" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading courses...</span>
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        No courses available. Create a course first.
                      </p>
                    </div>
                  ) : (
                    <SelectComponent value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className="border-[#65B32E]/30">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#65B32E]/20">
                        {courses.map((course: CourseWithRelations) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectComponent>
                  )}
                </div>

                {selectedGroup && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      This will enroll all <strong>{selectedGroup.members}</strong> member(s) in the selected course.
                    </p>
                  </div>
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
                    disabled={enrollGroupMutation.isPending || coursesLoading || !selectedCourseId}
                  >
                    {enrollGroupMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      "Enroll Group"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenEnroll(false)
                      setSelectedGroup(null)
                      setSelectedCourseId("")
                      setEnrollError(null)
                    }}
                    className="flex-1 border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
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
            {groupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#65B32E]" />
                <span className="ml-2 text-sm text-muted-foreground">Loading groups...</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-muted-foreground mb-4">No groups yet. Create your first group to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#65B32E]/20 hover:bg-transparent">
                    <TableHead className="text-[#65B32E]">Name</TableHead>
                    <TableHead className="text-[#65B32E]">Members</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group: Group) => (
                    <TableRow key={group.id} className="border-[#65B32E]/20 hover:bg-[#65B32E]/5">
                      <TableCell>
                        <Link href={`/org/groups/${group.id}`} className="font-medium text-[#65B32E] hover:underline">
                          {group.name}
                        </Link>
                      </TableCell>
                      <TableCell>{group.members} {group.members === 1 ? "member" : "members"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-[#65B32E]/10">
                              <MoreHorizontal size={16} className="text-[#65B32E]" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-[#65B32E]/20">
                            <DropdownMenuItem onClick={() => handleOpenEnroll(group)} className="hover:bg-[#65B32E]/10 text-[#65B32E]">
                              <BookOpen size={16} className="mr-2" />
                              Enroll to Course
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="hover:bg-[#65B32E]/10">
                              <Link href={`/org/groups/${group.id}/edit`} className="text-[#65B32E]">
                                <Edit2 size={16} className="mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[#DE1915] hover:bg-[#DE1915]/10">
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
