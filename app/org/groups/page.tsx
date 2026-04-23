"use client"

import { useState, useMemo, useEffect } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select as SelectComponent, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Plus, Edit2, Trash2, Loader2, BookOpen } from "lucide-react"
import { getGroups, createGroup, getGroupById, updateGroup, deleteGroup, getOrganizationMembers, getCourses, enrollGroupToCourse, type Group, type OrganizationMember, type CourseWithRelations } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getUserFullName } from "@/lib/utils/user"

export default function GroupsPage() {
  const queryClient = useQueryClient()
  const [openCreate, setOpenCreate] = useState(false)
  const [openEnroll, setOpenEnroll] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [groupName, setGroupName] = useState("")
  const [editGroupName, setEditGroupName] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]) // Array of userId
  const [editSelectedMembers, setEditSelectedMembers] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
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
    enabled: !!organizationId && (openCreate || openEdit),
  })

  // Fetch courses for enrollment
  const { data: coursesResponse, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", organizationId],
    queryFn: () => getCourses(organizationId),
    enabled: !!organizationId && openEnroll,
  })
  const { data: selectedGroupResponse, isLoading: selectedGroupLoading } = useQuery({
    queryKey: ["group-details", selectedGroup?.id],
    queryFn: () => getGroupById(selectedGroup!.id),
    enabled: !!selectedGroup?.id && openEdit,
  })

  const courses = coursesResponse?.data || []

  const groups = groupsResponse?.data || []
  const members = membersResponse?.data || []

  useEffect(() => {
    if (openEdit && selectedGroupResponse?.data) {
      setEditSelectedMembers(selectedGroupResponse.data.memberIds || [])
    }
  }, [openEdit, selectedGroupResponse])

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
      borderColor: state.isFocused ? "#01402E" : "rgba(1, 64, 46, 0.2)",
      borderRadius: "calc(var(--radius) - 2px)",
      minHeight: "2.5rem",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(1, 64, 46, 0.2)" : "none",
      "&:hover": {
        borderColor: "#01402E",
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
        ? "#01402E"
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
      color: "#01402E",
    }),
    multiValueRemove: (base: any) => ({
      ...base,
      color: "#01402E",
      "&:hover": {
        backgroundColor: "#DE1915",
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

  const handleOpenEdit = (group: Group) => {
    setSelectedGroup(group)
    setEditGroupName(group.name)
    setEditSelectedMembers([])
    setEditError(null)
    setOpenEdit(true)
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

  const updateGroupMutation = useMutation({
    mutationFn: (data: { groupId: string; name: string; memberIds: string[] }) =>
      updateGroup(data.groupId, { name: data.name, memberIds: data.memberIds }),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["groups", organizationId] })
        setOpenEdit(false)
        setSelectedGroup(null)
        setEditGroupName("")
        setEditSelectedMembers([])
        setEditError(null)
        toast.success("Group updated", {
          description: `The group "${response.data.name}" has been updated.`,
        })
      } else {
        const errorMsg = typeof response.error === "string" ? response.error : "Failed to update group."
        setEditError(errorMsg)
        toast.error("Failed to update group", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : typeof error?.error === "string"
          ? error.error
          : "Failed to update group. Please try again."
      setEditError(errorMessage)
      toast.error("Failed to update group", {
        description: errorMessage,
      })
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: (response) => {
      if (response.data?.success) {
        queryClient.invalidateQueries({ queryKey: ["groups", organizationId] })
        toast.success("Group deleted", {
          description: `${groupToDelete?.name || "Group"} has been deleted.`,
        })
      } else {
        const errorMsg = typeof response.error === "string" ? response.error : "Failed to delete group."
        toast.error("Failed to delete group", {
          description: errorMsg,
        })
      }
      setGroupToDelete(null)
      setOpenDeleteDialog(false)
    },
    onError: (error: any) => {
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : typeof error?.error === "string"
          ? error.error
          : "Failed to delete group. Please try again."
      toast.error("Failed to delete group", {
        description: errorMessage,
      })
      setGroupToDelete(null)
      setOpenDeleteDialog(false)
    },
  })

  const handleUpdateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)

    if (!selectedGroup) {
      setEditError("No group selected")
      return
    }

    if (!editGroupName.trim()) {
      setEditError("Group name is required")
      return
    }

    updateGroupMutation.mutate({
      groupId: selectedGroup.id,
      name: editGroupName.trim(),
      memberIds: editSelectedMembers,
    })
  }

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group)
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    if (!groupToDelete) return
    deleteGroupMutation.mutate(groupToDelete.id)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Groups</h1>
            <p className="text-black">Organize students into learning groups</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-white">
                <Plus size={16} className="mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-primary">Create New Group</DialogTitle>
                <DialogDescription>Create a new group and add organization members to it</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-primary">Group Name</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Web Development Cohort"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    className="border-primary/30 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-primary">Select Members</Label>
                  {membersLoading || selectedGroupLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-black">Loading members...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-black">
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
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
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
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Enroll Group to Course Dialog */}
          <Dialog open={openEnroll} onOpenChange={setOpenEnroll}>
            <DialogContent className="bg-white border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-primary">Enroll Group to Course</DialogTitle>
                <DialogDescription>
                  Enroll all members of "{selectedGroup?.name}" to a course
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEnrollGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course" className="text-primary">Select Course</Label>
                  {coursesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-black">Loading courses...</span>
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-black">
                        No courses available. Create a course first.
                      </p>
                    </div>
                  ) : (
                    <SelectComponent value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className="border-primary/30">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-primary/20">
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
                    <p className="text-sm text-black">
                      This will enroll all <strong>{selectedGroup.members}</strong> member(s) in the selected course.
                    </p>
                  </div>
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
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openEdit} onOpenChange={setOpenEdit}>
            <DialogContent className="bg-white border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-primary">Edit Group</DialogTitle>
                <DialogDescription>Update group details and members</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editGroupName" className="text-primary">Group Name</Label>
                  <Input
                    id="editGroupName"
                    placeholder="e.g., Web Development Cohort"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    required
                    className="border-primary/30 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-primary">Select Members</Label>
                  {membersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-black">Loading members...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm text-black">
                        No members available in your organization.
                      </p>
                    </div>
                  ) : (
                    <Select
                      isMulti
                      options={memberOptions}
                      value={memberOptions.filter((option) => editSelectedMembers.includes(option.value))}
                      onChange={(newValue: MultiValue<{ value: string; label: string; member: OrganizationMember }>) => {
                        setEditSelectedMembers(newValue ? newValue.map((option: { value: string; label: string; member: OrganizationMember }) => option.value) : [])
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

                {editError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{editError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    disabled={updateGroupMutation.isPending || membersLoading || selectedGroupLoading}
                  >
                    {updateGroupMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenEdit(false)
                      setSelectedGroup(null)
                      setEditGroupName("")
                      setEditSelectedMembers([])
                      setEditError(null)
                    }}
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-primary/20 bg-white">
          <CardContent className="p-0">
            {groupsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-black">Loading groups...</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-sm text-black mb-4">No groups yet. Create your first group to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/20 hover:bg-transparent">
                    <TableHead className="text-primary">Name</TableHead>
                    <TableHead className="text-primary">Members</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group: Group) => (
                    <TableRow key={group.id} className="border-primary/20 hover:bg-primary/5">
                      <TableCell>
                        <Link href={`/org/groups/${group.id}`} className="font-medium text-primary hover:underline">
                          {group.name}
                        </Link>
                      </TableCell>
                      <TableCell>{group.members} {group.members === 1 ? "member" : "members"}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                              <MoreHorizontal size={16} className="text-primary" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-primary/20">
                            <DropdownMenuItem onClick={() => handleOpenEnroll(group)} className="hover:bg-primary/10 text-primary">
                              <BookOpen size={16} className="mr-2" />
                              Enroll to Course
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(group)}
                              className="hover:bg-primary/10 text-primary"
                            >
                              <Edit2 size={16} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(group)}
                              className="text-destructive hover:bg-destructive/10"
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
            )}
          </CardContent>
        </Card>
        <AlertDialog
          open={openDeleteDialog}
          onOpenChange={(open) => {
            setOpenDeleteDialog(open)
            if (!open) {
              setGroupToDelete(null)
            }
          }}
        >
          <AlertDialogContent className="bg-white border-destructive/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Delete group?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{groupToDelete?.name || "this group"}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleConfirmDelete}
                disabled={deleteGroupMutation.isPending}
              >
                {deleteGroupMutation.isPending ? (
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
