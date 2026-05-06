"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
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
import {
  getCurrentUser,
  getPrimaryOrganization,
  removeOrganizationFromSession,
  updateOrganizationInSession,
} from "@/lib/session"
import {
  deleteOrganization,
  getOrganizationSettings,
  updateOrganizationSettings,
  uploadOrganizationLogo,
} from "@/lib/api-calls"
import { applyOrganizationTheme } from "@/lib/theme"
import { toast } from "sonner"

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const primaryOrganization = getPrimaryOrganization()
  const currentUser = getCurrentUser()
  const organizationId = primaryOrganization?.id || ""

  const [orgData, setOrgData] = useState({
    name: "",
    description: "",
    logo: "",
    themePrimaryColor: "#01402E",
    themeSecondaryColor: "#65B32E",
    themeAccentColor: "#DE1915",
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasInitializedForm, setHasInitializedForm] = useState(false)
  const [openDeleteOrgDialog, setOpenDeleteOrgDialog] = useState(false)

  const { data: settingsResponse, isLoading } = useQuery({
    queryKey: ["organization-settings", organizationId],
    queryFn: () => getOrganizationSettings(organizationId),
    enabled: !!organizationId,
  })

  useEffect(() => {
    if (!hasInitializedForm && primaryOrganization) {
      setOrgData((prev) => ({
        ...prev,
        name: primaryOrganization.name || "",
        logo: primaryOrganization.logo || "",
      }))
    }
  }, [hasInitializedForm, primaryOrganization])

  useEffect(() => {
    if (settingsResponse?.data) {
      setOrgData({
        name: settingsResponse.data.name || "",
        description: settingsResponse.data.description || "",
        logo: settingsResponse.data.logo || "",
        themePrimaryColor: settingsResponse.data.themePrimaryColor || "#01402E",
        themeSecondaryColor: settingsResponse.data.themeSecondaryColor || "#65B32E",
        themeAccentColor: settingsResponse.data.themeAccentColor || "#DE1915",
      })
      applyOrganizationTheme({
        themePrimaryColor: settingsResponse.data.themePrimaryColor,
        themeSecondaryColor: settingsResponse.data.themeSecondaryColor,
        themeAccentColor: settingsResponse.data.themeAccentColor,
      })
      setHasInitializedForm(true)
    }
  }, [settingsResponse])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setOrgData((prev) => ({ ...prev, [name]: value }))
  }

  const handleColorChange = (name: "themePrimaryColor" | "themeSecondaryColor" | "themeAccentColor", value: string) => {
    setOrgData((prev) => ({ ...prev, [name]: value }))
  }

  const updateSettingsMutation = useMutation({
    mutationFn: () => {
      if (!organizationId || !currentUser?.id) {
        throw new Error("Missing organization or user context")
      }

      return updateOrganizationSettings(organizationId, {
        requesterUserId: currentUser.id,
        name: orgData.name.trim(),
        description: orgData.description.trim() || null,
        logo: orgData.logo.trim() || null,
        themePrimaryColor: orgData.themePrimaryColor,
        themeSecondaryColor: orgData.themeSecondaryColor,
        themeAccentColor: orgData.themeAccentColor,
      })
    },
    onSuccess: (response) => {
      if (response.data) {
        applyOrganizationTheme({
          themePrimaryColor: response.data.themePrimaryColor,
          themeSecondaryColor: response.data.themeSecondaryColor,
          themeAccentColor: response.data.themeAccentColor,
        })
        updateOrganizationInSession(organizationId, {
          name: response.data.name,
          logo: response.data.logo,
          themePrimaryColor: response.data.themePrimaryColor,
          themeSecondaryColor: response.data.themeSecondaryColor,
          themeAccentColor: response.data.themeAccentColor,
        })
        window.dispatchEvent(new Event("focus"))
        setSaved(true)
        setError(null)
        toast.success("Organization preferences updated", {
          description: "Your branding and preference settings have been saved.",
        })
        setTimeout(() => setSaved(false), 3000)
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : "Failed to update organization settings."
        setError(errorMsg)
        toast.error("Failed to update settings", {
          description: errorMsg,
        })
      }
    },
    onError: (mutationError: any) => {
      const errorMessage =
        typeof mutationError?.message === "string"
          ? mutationError.message
          : "Failed to update organization settings."
      setError(errorMessage)
      toast.error("Failed to update settings", {
        description: errorMessage,
      })
    },
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => uploadOrganizationLogo(file),
    onSuccess: (response) => {
      if (response.data?.url) {
        setOrgData((prev) => ({ ...prev, logo: response.data!.url }))
        toast.success("Logo uploaded", {
          description: "Logo uploaded successfully. Save changes to apply it.",
        })
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : "Failed to upload logo."
        toast.error("Logo upload failed", {
          description: errorMsg,
        })
      }
    },
    onError: (mutationError: any) => {
      const errorMessage =
        typeof mutationError?.message === "string"
          ? mutationError.message
          : "Failed to upload logo."
      toast.error("Logo upload failed", {
        description: errorMessage,
      })
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadLogoMutation.mutate(file)
    }
    e.target.value = ""
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!orgData.name.trim()) {
      setError("Organization name is required")
      return
    }

    if (!organizationId || !currentUser?.id) {
      setError("Unable to resolve organization session context")
      return
    }

    updateSettingsMutation.mutate()
  }

  const deleteOrganizationMutation = useMutation({
    mutationFn: () => {
      if (!organizationId || !currentUser?.id) {
        throw new Error("Missing organization or user context")
      }
      return deleteOrganization(organizationId, currentUser.id)
    },
    onSuccess: (response) => {
      if (response.data?.success) {
        removeOrganizationFromSession(organizationId)
        setOpenDeleteOrgDialog(false)
        toast.success("Organization deleted", {
          description: "All organization data has been removed.",
        })
        router.push("/")
        return
      }
      const errorMsg = response.error?.message || "Failed to delete organization."
      toast.error("Could not delete organization", {
        description: errorMsg,
      })
    },
    onError: (mutationError: unknown) => {
      const errorMessage =
        mutationError instanceof Error && typeof mutationError.message === "string"
          ? mutationError.message
          : "Failed to delete organization."
      toast.error("Could not delete organization", {
        description: errorMessage,
      })
    },
  })

  const handleConfirmDeleteOrganization = () => {
    deleteOrganizationMutation.mutate()
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
            <CardDescription>Set your basic organization preference and branding</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading settings...</span>
                </div>
              ) : (
                <>
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={orgData.name}
                  onChange={handleTextChange}
                  placeholder="Enter organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Organization Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={orgData.description}
                  onChange={handleTextChange}
                  placeholder="Briefly describe your organization"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Organization Logo URL</Label>
                <Input
                  id="logo"
                  name="logo"
                  value={orgData.logo}
                  onChange={handleTextChange}
                  placeholder="https://..."
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="logo-upload" className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      disabled={uploadLogoMutation.isPending}
                      asChild
                    >
                      <span>
                        {uploadLogoMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Logo
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp,.gif,image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={uploadLogoMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="themePrimaryColor">Primary Theme</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="themePrimaryColor"
                      type="color"
                      value={orgData.themePrimaryColor}
                      onChange={(e) => handleColorChange("themePrimaryColor", e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={orgData.themePrimaryColor}
                      onChange={(e) => handleColorChange("themePrimaryColor", e.target.value)}
                      placeholder="#01402E"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="themeSecondaryColor">Secondary Theme</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="themeSecondaryColor"
                      type="color"
                      value={orgData.themeSecondaryColor}
                      onChange={(e) => handleColorChange("themeSecondaryColor", e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={orgData.themeSecondaryColor}
                      onChange={(e) => handleColorChange("themeSecondaryColor", e.target.value)}
                      placeholder="#65B32E"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="themeAccentColor">Accent Theme</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="themeAccentColor"
                      type="color"
                      value={orgData.themeAccentColor}
                      onChange={(e) => handleColorChange("themeAccentColor", e.target.value)}
                      className="w-14 h-10 p-1"
                    />
                    <Input
                      value={orgData.themeAccentColor}
                      onChange={(e) => handleColorChange("themeAccentColor", e.target.value)}
                      placeholder="#DE1915"
                    />
                  </div>
                </div>
              </div>
                </>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </p>
              )}

              {saved && (
                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  Organization settings updated successfully!
                </p>
              )}

              <Button type="submit" className="w-full" disabled={updateSettingsMutation.isPending || isLoading}>
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
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
            <Button
              type="button"
              variant="destructive"
              onClick={() => setOpenDeleteOrgDialog(true)}
              disabled={!organizationId || !currentUser?.id}
            >
              Delete Organization
            </Button>
          </CardContent>
        </Card>

        <AlertDialog
          open={openDeleteOrgDialog}
          onOpenChange={(open) => {
            setOpenDeleteOrgDialog(open)
          }}
        >
          <AlertDialogContent className="bg-white border-destructive/20">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Delete organization?</AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-2">
                <span className="block">
                  This permanently deletes this organization and every record linked to it, including
                  members, subscriptions, courses, groups, departments, and other related data.
                </span>
                <span className="block font-medium text-foreground">
                  This cannot be undone. Only continue if you are certain.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteOrganizationMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirmDeleteOrganization()
                }}
                disabled={deleteOrganizationMutation.isPending}
              >
                {deleteOrganizationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, delete organization"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
