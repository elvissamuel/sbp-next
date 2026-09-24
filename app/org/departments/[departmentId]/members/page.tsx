"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getDepartments, getOrganizationMembers, type OrganizationMember } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { getUserFullName } from "@/lib/utils/user"
import { ArrowLeft, Loader2, Users } from "lucide-react"

export default function DepartmentMembersPage() {
  const params = useParams()
  const departmentId = params.departmentId as string
  const organizationId = getPrimaryOrganization()?.id || ""

  const { data: departmentsResponse, isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments", organizationId],
    queryFn: () => getDepartments(organizationId),
    enabled: !!organizationId,
  })

  const { data: membersResponse, isLoading: membersLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => getOrganizationMembers(organizationId),
    enabled: !!organizationId,
  })

  const department = departmentsResponse?.data?.find((item) => item.id === departmentId)
  const members = (membersResponse?.data || []).filter((member) => {
    if (member.departmentId) return member.departmentId === departmentId
    return !!department && member.department?.trim().toLowerCase() === department.name.trim().toLowerCase()
  })
  const isLoading = departmentsLoading || membersLoading

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">{department?.name || "Department"}</h1>
            <p className="text-muted-foreground">
              {department?.description || "Members assigned to this department"}
            </p>
          </div>
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/org/departments">
              <ArrowLeft size={16} className="mr-2" />
              Back to departments
            </Link>
          </Button>
        </div>

        <Card className="border-primary/20">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
              </div>
            ) : !department ? (
              <div className="py-12 text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">Department not found</h3>
                <p className="text-muted-foreground">This department is not in the current organization.</p>
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold text-primary mb-2">No members yet</h3>
                <p className="text-muted-foreground">No one has been assigned to {department.name}.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-primary/20 hover:bg-transparent">
                    <TableHead className="text-primary font-semibold">Name</TableHead>
                    <TableHead className="text-primary font-semibold">Email</TableHead>
                    <TableHead className="text-primary font-semibold">Job Title</TableHead>
                    <TableHead className="text-primary font-semibold">Role</TableHead>
                    <TableHead className="text-primary font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: OrganizationMember) => (
                    <TableRow key={member.id} className="border-primary/20 hover:bg-primary/5">
                      <TableCell className="font-medium text-primary">
                        {getUserFullName(member.firstName, member.lastName, member.name)}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>{member.jobTitle || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase border-primary/30">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.status === "pending" ? (
                          <Badge variant="outline" className="border-amber-500 text-amber-700">
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-primary text-white">
                            Active
                          </Badge>
                        )}
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
