"use client"

import type React from "react"

import Link from "next/link"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { getCurrentUser, updateUserInSession } from "@/lib/session"
import { resolveFirstLastForProfile } from "@/lib/utils/user"
import { changeUserPassword, getUserProfile, updateUserProfile } from "@/lib/api-calls"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const currentUser = getCurrentUser()
  const userId = currentUser?.id || ""
  const sessionNames = resolveFirstLastForProfile(
    currentUser?.firstName,
    currentUser?.lastName,
    currentUser?.name
  )

  const [formData, setFormData] = useState({
    firstName: sessionNames.firstName,
    lastName: sessionNames.lastName,
    email: currentUser?.email ?? "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileError, setProfileError] = useState<string | null>(null)

  const { data: profileResponse, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,
  })

  useEffect(() => {
    const p = profileResponse?.data
    if (!p) return
    const resolved = resolveFirstLastForProfile(p.firstName, p.lastName, p.name)
    setFormData((prev) => ({
      ...prev,
      firstName: resolved.firstName,
      lastName: resolved.lastName,
      email: p.email ?? "",
    }))
  }, [profileResponse])

  const updateProfileMutation = useMutation({
    mutationFn: () => {
      if (!userId) {
        throw new Error("You must be signed in to update your profile")
      }
      return updateUserProfile({
        userId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
      })
    },
    onSuccess: (response) => {
      if (response.data) {
        setProfileError(null)
        updateUserInSession({
          email: response.data.email,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          name: response.data.name,
        })
        window.dispatchEvent(new Event("session-changed"))
        void queryClient.invalidateQueries({ queryKey: ["user-profile", userId] })
        toast.success("Profile updated", {
          description: "Your account details have been saved.",
        })
        return
      }
      const msg = response.error?.message || "Failed to update profile."
      setProfileError(msg)
      toast.error("Could not update profile", { description: msg })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update profile."
      setProfileError(msg)
      toast.error("Could not update profile", { description: msg })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: () => {
      if (!userId) {
        throw new Error("You must be signed in")
      }
      return changeUserPassword({
        userId,
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })
    },
    onSuccess: (response) => {
      if (response.data?.success) {
        toast.success("Password updated", {
          description: "You can use your new password next time you sign in.",
        })
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }))
        return
      }
      const msg = response.error?.message || "Failed to change password."
      toast.error("Could not change password", { description: msg })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to change password."
      toast.error("Could not change password", { description: msg })
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    updateProfileMutation.mutate()
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match", {
        description: "New password and confirmation must be the same.",
      })
      return
    }
    changePasswordMutation.mutate()
  }

  if (!userId) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Sign in to view and edit your profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth/signin">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and security</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading profile...
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                    autoComplete="family-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>

                {profileError && (
                  <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{profileError}</p>
                )}

                <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={changePasswordMutation.isPending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending || profileLoading}>
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting your account is permanent and cannot be undone. All your data will be lost.
            </p>
            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
