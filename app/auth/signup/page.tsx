"use client"

import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { AuthLayout } from "@/components/layouts/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { JOB_TITLES, DEPARTMENTS } from "@/lib/constants"

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get email from URL params if this is an invite link
  const emailFromUrl = searchParams.get("email")
  const isInvite = searchParams.get("invite") === "true"
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    department: "",
    email: emailFromUrl || "",
    password: "",
    confirmPassword: "",
    organizationName: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState("")

  // Pre-fill email from URL params if present
  useEffect(() => {
    if (emailFromUrl) {
      setFormData((prev) => ({ ...prev, email: emailFromUrl }))
    }
  }, [emailFromUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters")
      setLoading(false)
      return
    }

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName) {
        setError("First name and last name are required")
        setLoading(false)
        return
      }

      // For invite flow, validate additional fields
      if (isInvite && (!formData.jobTitle || !formData.department)) {
        setError("Job title and department are required")
        setLoading(false)
        return
      }

      // Prepare signup data based on flow
      const signupData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      }

      // Add additional fields for invite flow
      if (isInvite) {
        signupData.jobTitle = formData.jobTitle
        signupData.department = formData.department
      }

      if (isInvite) {
        // For invite flow, get organizationId and role from URL params
        const orgId = searchParams.get("orgId")
        const role = searchParams.get("role")
        if (orgId) {
          signupData.organizationId = orgId
          if (role) {
            signupData.role = role
          }
        }
      } else {
        // For new org flow, include organizationName
        if (formData.organizationName) {
          signupData.organizationName = formData.organizationName
        }
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create account")
        return
      }

      // Store userId for verification email
      setUserId(data.user.id)

      // Redirect to email verification page
      router.push(`/auth/verify-email?userId=${data.user.id}`)
    } catch (err) {
      setError("Failed to create account. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Start learning today by creating your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            {!isInvite && (
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  placeholder="My Organization"
                  value={formData.organizationName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">You'll be the admin of this organization</p>
              </div>
            )}
            {isInvite && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  You've been invited to join a team. Complete your registration to get started.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            {isInvite && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Select
                    value={formData.jobTitle}
                    onValueChange={(value) => handleSelectChange("jobTitle", value)}
                    required
                    disabled={loading}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => handleSelectChange("department", value)}
                    required
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading || isInvite}
                readOnly={isInvite}
                className={isInvite ? "bg-muted cursor-not-allowed" : ""}
              />
              {isInvite && (
                <p className="text-xs text-muted-foreground">This email was provided in your invitation</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/auth/signin" className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Start learning today by creating your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    }>
      <SignUpForm />
    </Suspense>
  )
}
