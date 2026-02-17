"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MoreHorizontal, Plus, Edit2, Trash2, Loader2, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getDepartments, createDepartment, type Department } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { format } from "date-fns"

export default function DepartmentsPage() {
  const queryClient = useQueryClient()
  const [openCreate, setOpenCreate] = useState(false)
  const [departmentName, setDepartmentName] = useState("")
  const [departmentDescription, setDepartmentDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

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

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#65B32E]">Departments</h1>
            <p className="text-muted-foreground">Manage organizational departments</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white">
                <Plus size={16} className="mr-2" />
                Create Department
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-[#65B32E]/20">
              <DialogHeader>
                <DialogTitle className="text-[#65B32E]">Create New Department</DialogTitle>
                <DialogDescription>Create a new department for your organization</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="departmentName" className="text-[#65B32E]">
                    Department Name
                  </Label>
                  <Input
                    id="departmentName"
                    placeholder="e.g., Engineering, Marketing, Sales"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    required
                    className="border-[#65B32E]/30 focus:border-[#65B32E]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentDescription" className="text-[#65B32E]">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="departmentDescription"
                    placeholder="Add a description for this department..."
                    value={departmentDescription}
                    onChange={(e) => setDepartmentDescription(e.target.value)}
                    rows={4}
                    className="border-[#65B32E]/30 focus:border-[#65B32E]"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-[#DE1915]/10 border border-[#DE1915]/20 rounded-md">
                    <p className="text-sm text-[#DE1915]">{error}</p>
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
                    className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDepartmentMutation.isPending}
                    className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
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
        </div>

        {/* Departments Table */}
        <Card className="border-[#65B32E]/20 bg-white">
          <CardContent className="p-0">
            {departmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#65B32E]" />
                <span className="ml-2 text-sm text-muted-foreground">Loading departments...</span>
              </div>
            ) : departments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-[#65B32E] mb-2">No departments yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first department to organize your team members.
                </p>
                <Button
                  onClick={handleOpenCreate}
                  className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Create Department
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#65B32E]/20 hover:bg-transparent">
                    <TableHead className="text-[#65B32E] font-semibold">Name</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Description</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Members</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Created</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department: Department) => (
                    <TableRow
                      key={department.id}
                      className="border-[#65B32E]/20 hover:bg-[#65B32E]/5"
                    >
                      <TableCell className="font-medium text-[#65B32E]">{department.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {department.description || (
                          <span className="text-muted-foreground italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#65B32E]/30 text-[#65B32E]">
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
                              className="h-8 w-8 text-muted-foreground hover:text-[#65B32E]"
                            >
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-[#65B32E]/20">
                            <DropdownMenuItem className="text-[#65B32E] hover:bg-[#65B32E]/10 cursor-pointer">
                              <Edit2 size={16} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-[#DE1915] hover:bg-[#DE1915]/10 cursor-pointer">
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

