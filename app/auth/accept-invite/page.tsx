"use client"

import { Suspense, useEffect, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { acceptOrganizationInvite, getDepartments, getOrganizationSettings, signIn } from "@/lib/api-calls"
import { JOB_TITLES } from "@/lib/constants"
import { getSession, setActiveOrganization, setSession } from "@/lib/session"

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
] as const

type OrgRole = (typeof ROLE_OPTIONS)[number]["value"]

function isOrgRole(value: string | null): value is OrgRole {
  return ROLE_OPTIONS.some((option) => option.value === value)
}

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim().toLowerCase() || ""
  const orgId = searchParams.get("orgId") || ""
  const roleFromInvite = searchParams.get("role")
  const assignedRole: OrgRole = isOrgRole(roleFromInvite) ? roleFromInvite : "member"
  const assignedRoleLabel = ROLE_OPTIONS.find((option) => option.value === assignedRole)?.label || "Member"

  const [step, setStep] = useState<"signin" | "details">("signin")
  const [password, setPassword] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkedSession, setCheckedSession] = useState(false)

  const { data: organizationResponse } = useQuery({
    queryKey: ["organization-settings", orgId],
    queryFn: () => getOrganizationSettings(orgId),
    enabled: !!orgId,
  })

  const { data: departmentsResponse, isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments", orgId],
    queryFn: () => getDepartments(orgId),
    enabled: !!orgId && step === "details",
  })

  const organizationName = organizationResponse?.data?.name || "this organization"
  const departments = departmentsResponse?.data || []

  useEffect(() => {
    if (!email || !orgId) {
      setCheckedSession(true)
      return
    }

    const session = getSession()
    if (session?.user.email.toLowerCase() === email) {
      setStep("details")
    }
    setCheckedSession(true)
  }, [email, orgId])

  const openOrganization = (organization: {
    id: string
    name: string
    slug: string
    logo: string | null
    themePrimaryColor?: string | null
    themeSecondaryColor?: string | null
    themeAccentColor?: string | null
    role: string
    joinedAt: string | Date
  }) => {
    const session = getSession()
    if (!session) return

    const nextOrganization = {
      ...organization,
      joinedAt: new Date(organization.joinedAt).toISOString(),
    }
    const organizations = session.organizations.some((org) => org.id === organization.id)
      ? session.organizations.map((org) => (org.id === organization.id ? nextOrganization : org))
      : [...session.organizations, nextOrganization]

    setSession({
      ...session,
      organizations,
    })
    setActiveOrganization(organization.id)
    router.push("/dashboard")
  }

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await signIn({ email, password })
      if (!response.data) {
        setError(response.error?.message || "Could not sign in")
        return
      }

      const signedInUser = response.data.user as {
        id: string
        email: string
        firstName?: string | null
        lastName?: string | null
        name: string | null
      }
      const organizations = (response.data.organizations || []).map((org) => ({
        ...org,
        joinedAt: new Date(org.joinedAt).toISOString(),
      }))

      setSession({
        user: {
          id: signedInUser.id,
          email: signedInUser.email,
          firstName: signedInUser.firstName ?? null,
          lastName: signedInUser.lastName ?? null,
          name: signedInUser.name,
        },
        organizations,
      })
      localStorage.setItem("user", JSON.stringify(response.data.user))
      window.dispatchEvent(new Event("session-changed"))

      setStep("details")
    } catch (signInError) {
      console.error("Error signing in to accept invite:", signInError)
      setError("Could not sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (event: FormEvent) => {
    event.preventDefault()
    setError("")

    const session = getSession()
    if (!session || session.user.email.toLowerCase() !== email) {
      setStep("signin")
      setError("Sign in with the invited email address")
      return
    }

    if (!jobTitle) {
      setError("Select a job title for this organization")
      return
    }

    if (departments.length > 0 && !departmentId) {
      setError("Select a department for this organization")
      return
    }

    setLoading(true)
    try {
      const response = await acceptOrganizationInvite({
        organizationId: orgId,
        email,
        userId: session.user.id,
        role: assignedRole,
        jobTitle,
        ...(departmentId ? { departmentId } : {}),
      })

      if (!response.data?.organization) {
        const message = response.error?.message || "Could not join this organization"
        if (message.toLowerCase().includes("already a member")) {
          setActiveOrganization(orgId)
          router.push("/dashboard")
          return
        }
        setError(message)
        return
      }

      openOrganization(response.data.organization)
    } catch (acceptError) {
      console.error("Error accepting invite:", acceptError)
      setError("Could not join this organization")
    } finally {
      setLoading(false)
    }
  }

  if (!email || !orgId) {
    return (
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle>Invitation link is incomplete</CardTitle>
            <CardDescription>Open the invitation from the email again.</CardDescription>
          </CardHeader>
        </Card>
      </AuthLayout>
    )
  }

  if (!checkedSession) {
    return (
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle>Accept invitation</CardTitle>
            <CardDescription>Loading your invitation...</CardDescription>
          </CardHeader>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Join {organizationName}</CardTitle>
          <CardDescription>
            {step === "signin"
              ? "Sign in with your existing account. You will not need to enter your name again."
              : "Your role was assigned when you were invited. Choose the department and job title you will use in this organization."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} readOnly disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAccept} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} readOnly disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role in this organization</Label>
                <Input id="role" value={assignedRoleLabel} readOnly disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">This role was chosen by the person who invited you.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job title in this organization</Label>
                <Select value={jobTitle} onValueChange={setJobTitle} disabled={loading}>
                  <SelectTrigger id="jobTitle">
                    <SelectValue placeholder="Select your job title" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLES.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department in this organization</Label>
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  disabled={loading || departmentsLoading || departments.length === 0}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Select a department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {departments.length === 0 && !departmentsLoading && (
                  <p className="text-xs text-muted-foreground">
                    This organization has no departments yet. You can still join after choosing a job title.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || departmentsLoading}>
                {loading ? "Joining..." : "Join organization"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <Card>
            <CardHeader>
              <CardTitle>Accept invitation</CardTitle>
              <CardDescription>Loading your invitation...</CardDescription>
            </CardHeader>
          </Card>
        </AuthLayout>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  )
}
