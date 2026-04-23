"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Textarea } from "@/components/ui/textarea"
import { MoreHorizontal, Plus, Edit2, Trash2, Loader2, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, type Department } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { format } from "date-fns"

export default function DepartmentsPage() {
  const queryClient = useQueryClient()
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
  const [departmentName, setDepartmentName] = useState("")
  const [departmentDescription, setDepartmentDescription] = useState("")
  const [editDepartmentName, setEditDepartmentName] = useState("")
  const [editDepartmentDescription, setEditDepartmentDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  // Fetch departments
  const { data: departmentsResponse, isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments", organizationId],
    queryFn: () => getDepartments(organizationId),
    enabled: !!organizationId,
  })

  const departments = departmentsResponse?.data || []

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: (data: { organizationId: string; name: string; description?: string }) =>
      createDepartment(data),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["departments", organizationId] })
        setOpenCreate(false)
        setDepartmentName("")
        setDepartmentDescription("")
        setError(null)
        toast.success("Department created successfully", {
          description: `The department "${response.data.name}" has been created.`,
        })
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : "An error occurred while creating the department."
        setError(errorMsg)
        toast.error("Failed to create department", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error creating department:", error)
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : typeof error?.error === "string"
            ? error.error
            : "Failed to create department. Please try again."
      setError(errorMessage)
      toast.error("Failed to create department", {
        description: errorMessage,
      })
    },
  })

  const handleOpenCreate = () => {
    setDepartmentName("")
    setDepartmentDescription("")
    setError(null)
    setOpenCreate(true)
  }

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!departmentName.trim()) {
      const errorMsg = "Department name is required"
      setError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    createDepartmentMutation.mutate({
      organizationId,
      name: departmentName.trim(),
      description: departmentDescription.trim() || undefined,
    })
  }

  const updateDepartmentMutation = useMutation({
    mutationFn: (data: { departmentId: string; name: string; description?: string }) =>
      updateDepartment(data.departmentId, {
        name: data.name,
        description: data.description ?? null,
      }),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["departments", organizationId] })
        setOpenEdit(false)
        setSelectedDepartment(null)
        setEditDepartmentName("")
        setEditDepartmentDescription("")
        setEditError(null)
        toast.success("Department updated successfully", {
          description: `The department "${response.data.name}" has been updated.`,
        })
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : "An error occurred while updating the department."
        setEditError(errorMsg)
        toast.error("Failed to update department", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error updating department:", error)
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : typeof error?.error === "string"
            ? error.error
            : "Failed to update department. Please try again."
      setEditError(errorMessage)
      toast.error("Failed to update department", {
        description: errorMessage,
      })
    },
  })

  const deleteDepartmentMutation = useMutation({
    mutationFn: (departmentId: string) => deleteDepartment(departmentId),
    onSuccess: (response) => {
      if (response.data?.success) {
        queryClient.invalidateQueries({ queryKey: ["departments", organizationId] })
        toast.success("Department deleted successfully", {
          description: `"${departmentToDelete?.name || "Department"}" has been deleted.`,
        })
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : "An error occurred while deleting the department."
        toast.error("Failed to delete department", {
          description: errorMsg,
        })
      }
      setOpenDeleteDialog(false)
      setDepartmentToDelete(null)
    },
    onError: (error: any) => {
      console.error("Error deleting department:", error)
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : typeof error?.error === "string"
            ? error.error
            : "Failed to delete department. Please try again."
      toast.error("Failed to delete department", {
        description: errorMessage,
      })
      setOpenDeleteDialog(false)
      setDepartmentToDelete(null)
    },
  })

  const handleOpenEdit = (department: Department) => {
    setSelectedDepartment(department)
    setEditDepartmentName(department.name)
    setEditDepartmentDescription(department.description || "")
    setEditError(null)
    setOpenEdit(true)
  }

  const handleUpdateDepartment = (e: React.FormEvent) => {
    e.preventDefault()
    setEditError(null)

    if (!selectedDepartment) {
      setEditError("No department selected")
      return
    }

    if (!editDepartmentName.trim()) {
      setEditError("Department name is required")
      return
    }

    updateDepartmentMutation.mutate({
      departmentId: selectedDepartment.id,
      name: editDepartmentName.trim(),
      description: editDepartmentDescription.trim() || undefined,
    })
  }

  const handleOpenDelete = (department: Department) => {
    setDepartmentToDelete(department)
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    if (!departmentToDelete) return
    deleteDepartmentMutation.mutate(departmentToDelete.id)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Departments</h1>
            <p className="text-muted-foreground">Manage organizational departments</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-white">
                <Plus size={16} className="mr-2" />
                Create Department
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-primary">Create New Department</DialogTitle>
                <DialogDescription>Create a new department for your organization</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="departmentName" className="text-primary">
                    Department Name
                  </Label>
                  <Input
                    id="departmentName"
                    placeholder="e.g., Engineering, Marketing, Sales"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    required
                    className="border-primary/30 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentDescription" className="text-primary">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="departmentDescription"
                    placeholder="Add a description for this department..."
                    value={departmentDescription}
                    onChange={(e) => setDepartmentDescription(e.target.value)}
                    rows={4}
                    className="border-primary/30 focus:border-primary"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenCreate(false)
                      setError(null)
                    }}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDepartmentMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {createDepartmentMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Department"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openEdit} onOpenChange={setOpenEdit}>
            <DialogContent className="bg-white border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-primary">Edit Department</DialogTitle>
                <DialogDescription>Update department details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateDepartment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editDepartmentName" className="text-primary">
                    Department Name
                  </Label>
                  <Input
                    id="editDepartmentName"
                    placeholder="e.g., Engineering, Marketing, Sales"
                    value={editDepartmentName}
                    onChange={(e) => setEditDepartmentName(e.target.value)}
                    required
                    className="border-primary/30 focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editDepartmentDescription" className="text-primary">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="editDepartmentDescription"
                    placeholder="Add a description for this department..."
                    value={editDepartmentDescription}
                    onChange={(e) => setEditDepartmentDescription(e.target.value)}
                    rows={4}
                    className="border-primary/30 focus:border-primary"
                  />
                </div>

                {editError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{editError}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenEdit(false)
                      setSelectedDepartment(null)
                      setEditError(null)
                    }}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateDepartmentMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    {updateDepartmentMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Departments Table */}
        <Card className="border-primary/20 bg-white">
          <CardContent className="p-0">
            {departmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading departments...</span>
              </div>
            ) : departments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No departments yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first department to organize your team members.
                </p>
                <Button
                  onClick={handleOpenCreate}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Create Department
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/20 hover:bg-transparent">
                    <TableHead className="text-primary font-semibold">Name</TableHead>
                    <TableHead className="text-primary font-semibold">Description</TableHead>
                    <TableHead className="text-primary font-semibold">Members</TableHead>
                    <TableHead className="text-primary font-semibold">Created</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department: Department) => (
                    <TableRow
                      key={department.id}
                      className="border-primary/20 hover:bg-primary/5"
                    >
                      <TableCell className="font-medium text-primary">{department.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {department.description || (
                          <span className="text-muted-foreground italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {department.memberCount} {department.memberCount === 1 ? "member" : "members"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(department.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                            >
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-primary/20">
                            <DropdownMenuItem
                              className="text-primary hover:bg-primary/10 cursor-pointer"
                              onClick={() => handleOpenEdit(department)}
                            >
                              <Edit2 size={16} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => handleOpenDelete(department)}
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
              setDepartmentToDelete(null)
            }
          }}
        >
          <AlertDialogContent className="bg-white border-destructive/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Delete department?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{departmentToDelete?.name || "this department"}</span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleConfirmDelete}
                disabled={deleteDepartmentMutation.isPending}
              >
                {deleteDepartmentMutation.isPending ? (
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

