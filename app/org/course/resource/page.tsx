"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { deleteOrganizationResource, getOrganizationResources, updateOrganizationResource, type CourseResource } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { toast } from "sonner"
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { LessonContentEditor } from "@/components/lesson/lesson-content-editor"

export default function LibraryPage() {
  const queryClient = useQueryClient()
  const organizationId = getPrimaryOrganization()?.id || ""
  const [viewing, setViewing] = useState<CourseResource | null>(null)
  const [editing, setEditing] = useState<CourseResource | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [deleting, setDeleting] = useState<CourseResource | null>(null)

  const { data: resourcesResponse, isLoading } = useQuery({
    queryKey: ["organization-resources", organizationId],
    queryFn: () => getOrganizationResources(organizationId),
    enabled: !!organizationId,
  })

  const resources = resourcesResponse?.data || []

  const updateMutation = useMutation({
    mutationFn: () =>
      updateOrganizationResource(editing!.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      }),
    onSuccess: (response) => {
      if (!response.data) {
        toast.error("Could not update resource", {
          description: response.error?.message || "Failed to update resource",
        })
        return
      }
      queryClient.invalidateQueries({ queryKey: ["organization-resources", organizationId] })
      toast.success("Resource updated")
      setEditing(null)
    },
    onError: () => {
      toast.error("Could not update resource")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (resourceId: string) => deleteOrganizationResource(resourceId),
    onSuccess: (response) => {
      if (!response.data?.success) {
        toast.error("Could not delete resource", {
          description: response.error?.message || "Failed to delete resource",
        })
        return
      }
      queryClient.invalidateQueries({ queryKey: ["organization-resources", organizationId] })
      toast.success("Resource deleted")
      setDeleting(null)
    },
    onError: () => {
      toast.error("Could not delete resource")
    },
  })

  const openEdit = (resource: CourseResource) => {
    setEditing(resource)
    setEditTitle(resource.title)
    setEditContent(resource.content || "")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Library</h1>
            <p className="text-black">Organization resources that lesson generation can reference</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-white">
            <Link href="/org/course/resource/upload">
              <Plus size={16} className="mr-2" />
              Update Library
            </Link>
          </Button>
        </div>

        <Card className="border-primary/20 bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20 hover:bg-transparent">
                  <TableHead className="text-primary">Title</TableHead>
                  <TableHead className="text-primary">Type</TableHead>
                  <TableHead className="text-primary">Added</TableHead>
                  <TableHead className="text-primary text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-black">
                      No resources yet. Update the library to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((resource) => (
                    <TableRow key={resource.id} className="border-primary/20 hover:bg-primary/5">
                      <TableCell className="font-medium text-primary">{resource.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase border-primary/30">{resource.type}</Badge>
                      </TableCell>
                      <TableCell>{new Date(resource.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => setViewing(resource)}>
                            <Eye size={16} className="mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => openEdit(resource)}>
                            <Pencil size={16} className="mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleting(resource)}>
                            <Trash2 size={16} className="mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-primary">{viewing?.title}</DialogTitle>
            <DialogDescription>Organization library resource</DialogDescription>
          </DialogHeader>
          <div
            className="max-h-[50vh] overflow-y-auto text-sm text-black"
            dangerouslySetInnerHTML={{ __html: viewing?.content || "<p>This resource has no text content.</p>" }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && !updateMutation.isPending && setEditing(null)}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-primary">Edit resource</DialogTitle>
            <DialogDescription>Update the title or the text lesson generation can reference.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <LessonContentEditor
                content={editContent}
                onContentChange={setEditContent}
                disabled={updateMutation.isPending}
                textOnly
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-white hover:bg-primary/90"
              disabled={
                updateMutation.isPending ||
                !editTitle.trim() ||
                !editContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
              }
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeleting(null)}>
        <AlertDialogContent className="bg-white border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-semibold">{deleting?.title}</span> from the library? Lesson generation will no longer be able to reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (deleting) deleteMutation.mutate(deleting.id)
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
