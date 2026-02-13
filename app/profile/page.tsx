"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Separator } from "@/components/ui/separator"

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    name: "John Doe",
    email: "john@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement profile update API
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      alert("Passwords do not match")
      return
    }
    // TODO: Implement password change API
    alert("Password changed successfully")
    setFormData((prev) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }))
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and security</p>
        </div>

        {/* Profile Information */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
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
                />
              </div>

              {saved && (
                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">Profile updated successfully!</p>
              )}

              <Button type="submit" className="w-full">
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Change Password */}
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
                  placeholder="••••••••"
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
                />
              </div>

              <Button type="submit" className="w-full">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Delete Account */}
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
