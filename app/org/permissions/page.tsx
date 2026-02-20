"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { getOrganizationMembers, updateAdminPermissions, type OrganizationMember } from "@/lib/api-calls"
import { getPrimaryOrganization, getCurrentUser } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getUserFullName } from "@/lib/utils/user"
import { isSuperAdmin } from "@/lib/permissions"
import { Loader2, Settings, Shield } from "lucide-react"
import type { AdminPermissions } from "@/lib/permissions"

export default function PermissionsPage() {
  const queryClient = useQueryClient()
  const [selectedAdmin, setSelectedAdmin] = useState<OrganizationMember | null>(null)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [permissions, setPermissions] = useState<AdminPermissions>({
    canManageCourses: false,
    canManageMembers: false,
    canManageSettings: false,
    canManageDepartments: false,
    canManageLevels: false,
    canViewAnalytics: false,
    canManageGroups: false,
  })

  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""
  const currentUser = getCurrentUser()
  const userRole = primaryOrganization?.role || "member"

  // Check if current user is superadmin
  if (!isSuperAdmin(userRole)) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <AppBreadcrumbs />
          <Card className="bg-white border-[#DE1915]/20">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-[#DE1915] mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-[#DE1915] mb-2">Access Denied</h2>
                <p className="text-muted-foreground">Only superadmin can manage admin permissions.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Fetch organization members
  const { data: membersResponse, isLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId),
    enabled: !!organizationId,
  })

  const members = membersResponse?.data || []
  const admins = members.filter((member) => member.role === "admin")
  const superAdmins = members.filter((member) => member.role === "superadmin")

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: (data: { memberId: string; permissions: AdminPermissions }) =>
      updateAdminPermissions(data.memberId, data.permissions, currentUser?.id),
    onSuccess: (response) => {
      if (response.data) {
        toast.success("Permissions updated successfully", {
          description: `Permissions for ${getUserFullName(selectedAdmin?.firstName, selectedAdmin?.lastName, selectedAdmin?.name) || selectedAdmin?.email} have been updated.`,
        })
        queryClient.invalidateQueries({ queryKey: ["organization-members", organizationId] })
        setOpenEditDialog(false)
        setSelectedAdmin(null)
      } else if (response.error) {
        const errorMsg = typeof response.error === "string" ? response.error : response.error?.message || "Failed to update permissions"
        toast.error("Failed to update permissions", { description: errorMsg })
      }
    },
    onError: (error: any) => {
      console.error("Error updating permissions:", error)
      toast.error("Failed to update permissions", {
        description: error?.message || "An unexpected error occurred",
      })
    },
  })

  const handleOpenEditDialog = (admin: OrganizationMember) => {
    setSelectedAdmin(admin)
    setPermissions(
      (admin.adminPermissions as AdminPermissions) || {
        canManageCourses: false,
        canManageMembers: false,
        canManageSettings: false,
        canManageDepartments: false,
        canManageLevels: false,
        canViewAnalytics: false,
        canManageGroups: false,
      }
    )
    setOpenEditDialog(true)
  }

  const handleSavePermissions = () => {
    if (!selectedAdmin) return
    updatePermissionsMutation.mutate({
      memberId: selectedAdmin.id,
      permissions,
    })
  }

  const togglePermission = (key: keyof AdminPermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#65B32E]">Admin Permissions</h1>
            <p className="text-muted-foreground mt-1">Manage what admins can see and do in your organization</p>
          </div>
        </div>

        <Card className="bg-white border-[#65B32E]/20">
          <CardHeader>
            <CardTitle className="text-[#65B32E]">Super Admins</CardTitle>
            <CardDescription>Organization creators with full access</CardDescription>
          </CardHeader>
          <CardContent>
            {superAdmins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No super admins found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#65B32E] font-semibold">Name</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Email</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Role</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {superAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        {getUserFullName(admin.firstName, admin.lastName, admin.name) || admin.email}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Badge className="bg-[#65B32E] text-white">Super Admin</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#65B32E]/30 text-[#65B32E]">
                          Full Access
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#65B32E]/20">
          <CardHeader>
            <CardTitle className="text-[#65B32E]">Admins</CardTitle>
            <CardDescription>Manage permissions for admin users</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#65B32E]" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admins found. Invite members and assign them admin role to manage permissions.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#65B32E] font-semibold">Name</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Email</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Permissions</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const adminPerms = (admin.adminPermissions as AdminPermissions) || {}
                    const activePermissions = Object.values(adminPerms).filter(Boolean).length
                    const totalPermissions = Object.keys(adminPerms).length

                    return (
                      <TableRow key={admin.id}>
                        <TableCell>
                          {getUserFullName(admin.firstName, admin.lastName, admin.name) || admin.email}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[#65B32E]/30 text-[#65B32E]">
                            {activePermissions}/{totalPermissions} Permissions
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditDialog(admin)}
                            className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Permissions Dialog */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="max-w-2xl bg-white border-[#65B32E]/20">
            <DialogHeader>
              <DialogTitle className="text-[#65B32E]">
                Manage Permissions: {getUserFullName(selectedAdmin?.firstName, selectedAdmin?.lastName, selectedAdmin?.name) || selectedAdmin?.email}
              </DialogTitle>
              <DialogDescription>Control what this admin can see and do in your organization</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md border border-[#65B32E]/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="canManageCourses" className="text-[#65B32E] font-medium">
                      Manage Courses
                    </Label>
                    <p className="text-sm text-muted-foreground">Create, edit, and delete courses</p>
                  </div>
                  <Switch
                    id="canManageCourses"
                    checked={permissions.canManageCourses}
                    onCheckedChange={() => togglePermission("canManageCourses")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border border-[#65B32E]/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="canManageMembers" className="text-[#65B32E] font-medium">
                      Manage Members
                    </Label>
                    <p className="text-sm text-muted-foreground">Invite, remove, and manage team members</p>
                  </div>
                  <Switch
                    id="canManageMembers"
                    checked={permissions.canManageMembers}
                    onCheckedChange={() => togglePermission("canManageMembers")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border border-[#65B32E]/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="canManageSettings" className="text-[#65B32E] font-medium">
                      Manage Settings
                    </Label>
                    <p className="text-sm text-muted-foreground">Access and modify organization settings</p>
                  </div>
                  <Switch
                    id="canManageSettings"
                    checked={permissions.canManageSettings}
                    onCheckedChange={() => togglePermission("canManageSettings")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border border-[#65B32E]/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="canManageDepartments" className="text-[#65B32E] font-medium">
                      Manage Departments
                    </Label>
                    <p className="text-sm text-muted-foreground">Create and manage departments</p>
                  </div>
                  <Switch
                    id="canManageDepartments"
                    checked={permissions.canManageDepartments}
                    onCheckedChange={() => togglePermission("canManageDepartments")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border border-[#65B32E]/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="canManageLevels" className="text-[#65B32E] font-medium">
                      Manage Levels
                    </Label>
                    <p className="text-sm text-muted-foreground">Create and manage organizational levels</p>
                  </div>
                  <Switch
                    id="canManageLevels"
                    checked={permissions.canManageLevels}
                    onCheckedChange={() => togglePermission("canManageLevels")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border border-[#65B32E]/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="canViewAnalytics" className="text-[#65B32E] font-medium">
                      View Analytics
                    </Label>
                    <p className="text-sm text-muted-foreground">Access analytics and reports</p>
                  </div>
                  <Switch
                    id="canViewAnalytics"
                    checked={permissions.canViewAnalytics}
                    onCheckedChange={() => togglePermission("canViewAnalytics")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md border border-[#65B32E]/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="canManageGroups" className="text-[#65B32E] font-medium">
                      Manage Groups
                    </Label>
                    <p className="text-sm text-muted-foreground">Create and manage learning groups</p>
                  </div>
                  <Switch
                    id="canManageGroups"
                    checked={permissions.canManageGroups}
                    onCheckedChange={() => togglePermission("canManageGroups")}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setOpenEditDialog(false)
                  setSelectedAdmin(null)
                }}
                className="border-[#65B32E]/30 text-[#65B32E] hover:bg-[#65B32E]/10"
                disabled={updatePermissionsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePermissions}
                className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
                disabled={updatePermissionsMutation.isPending}
              >
                {updatePermissionsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Permissions"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

