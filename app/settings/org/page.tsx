"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Separator } from "@/components/ui/separator"

export default function OrganizationSettingsPage() {
  const [orgData, setOrgData] = useState({
    name: "Acme Learning",
    email: "info@acmelearning.com",
  })
  const [saved, setSaved] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setOrgData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement organization update API
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Organization Settings</h1>
          <p className="text-muted-foreground">Manage your organization information</p>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Update your organization information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={orgData.name}
                  onChange={handleChange}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={orgData.email}
                  onChange={handleChange}
                  placeholder="Enter contact email"
                />
              </div>

              {saved && (
                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  Organization settings updated successfully!
                </p>
              )}

              <Button type="submit" className="w-full">
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting your organization will permanently remove all associated data.
            </p>
            <Button variant="destructive">Delete Organization</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
