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
import { MoreHorizontal, Plus, Edit2, Trash2, Loader2, Layers } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getLevels, createLevel, type Level } from "@/lib/api-calls"
import { getPrimaryOrganization } from "@/lib/session"
import { toast } from "sonner"
import { AppBreadcrumbs } from "@/components/breadcrumbs"
import { format } from "date-fns"

export default function LevelsPage() {
  const queryClient = useQueryClient()
  const [openCreate, setOpenCreate] = useState(false)
  const [levelName, setLevelName] = useState("")
  const [levelNumber, setLevelNumber] = useState<number>(1)
  const [levelDescription, setLevelDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const primaryOrganization = getPrimaryOrganization()
  const organizationId = primaryOrganization?.id || ""

  // Fetch levels
  const { data: levelsResponse, isLoading: levelsLoading } = useQuery({
    queryKey: ["levels", organizationId],
    queryFn: () => getLevels(organizationId),
    enabled: !!organizationId,
  })

  const levels = levelsResponse?.data || []

  // Create level mutation
  const createLevelMutation = useMutation({
    mutationFn: (data: {
      organizationId: string
      name: string
      levelNumber: number
      description?: string
    }) => createLevel(data),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ["levels", organizationId] })
        setOpenCreate(false)
        setLevelName("")
        setLevelNumber(1)
        setLevelDescription("")
        setError(null)
        toast.success("Level created successfully", {
          description: `The level "${response.data.name}" (Level ${response.data.levelNumber}) has been created.`,
        })
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : "An error occurred while creating the level."
        setError(errorMsg)
        toast.error("Failed to create level", {
          description: errorMsg,
        })
      }
    },
    onError: (error: any) => {
      console.error("Error creating level:", error)
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : typeof error?.error === "string"
            ? error.error
            : "Failed to create level. Please try again."
      setError(errorMessage)
      toast.error("Failed to create level", {
        description: errorMessage,
      })
    },
  })

  const handleOpenCreate = () => {
    setLevelName("")
    setLevelNumber(1)
    setLevelDescription("")
    setError(null)
    setOpenCreate(true)
  }

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!levelName.trim()) {
      const errorMsg = "Level name is required"
      setError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    if (!levelNumber || levelNumber < 1 || !Number.isInteger(levelNumber)) {
      const errorMsg = "Level number must be a positive integer"
      setError(errorMsg)
      toast.error("Validation error", {
        description: errorMsg,
      })
      return
    }

    createLevelMutation.mutate({
      organizationId,
      name: levelName.trim(),
      levelNumber,
      description: levelDescription.trim() || undefined,
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 bg-white">
        <AppBreadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#65B32E]">Levels</h1>
            <p className="text-muted-foreground">Manage organizational hierarchy levels</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white">
                <Plus size={16} className="mr-2" />
                Create Level
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-[#65B32E]/20">
              <DialogHeader>
                <DialogTitle className="text-[#65B32E]">Create New Level</DialogTitle>
                <DialogDescription>
                  Create a new hierarchy level for your organization. Lower level numbers indicate higher hierarchy (Level 1 &gt; Level 2 &gt; Level 3).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateLevel} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="levelName" className="text-[#65B32E]">
                    Level Name
                  </Label>
                  <Input
                    id="levelName"
                    placeholder="e.g., Executive, Manager, Senior, Junior"
                    value={levelName}
                    onChange={(e) => setLevelName(e.target.value)}
                    required
                    className="border-[#65B32E]/30 focus:border-[#65B32E]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="levelNumber" className="text-[#65B32E]">
                    Level Number
                  </Label>
                  <Input
                    id="levelNumber"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={levelNumber}
                    onChange={(e) => setLevelNumber(parseInt(e.target.value) || 1)}
                    required
                    className="border-[#65B32E]/30 focus:border-[#65B32E]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers indicate higher hierarchy (1 = highest level)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="levelDescription" className="text-[#65B32E]">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="levelDescription"
                    placeholder="Add a description for this level..."
                    value={levelDescription}
                    onChange={(e) => setLevelDescription(e.target.value)}
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
                    disabled={createLevelMutation.isPending}
                    className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
                  >
                    {createLevelMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Level"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Levels Table */}
        <Card className="border-[#65B32E]/20 bg-white">
          <CardContent className="p-0">
            {levelsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#65B32E]" />
                <span className="ml-2 text-sm text-muted-foreground">Loading levels...</span>
              </div>
            ) : levels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-[#65B32E] mb-2">No levels yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Create your first level to establish organizational hierarchy.
                </p>
                <Button
                  onClick={handleOpenCreate}
                  className="bg-[#65B32E] hover:bg-[#65B32E]/90 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Create Level
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#65B32E]/20 hover:bg-transparent">
                    <TableHead className="text-[#65B32E] font-semibold">Level Number</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Name</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Description</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Members</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold">Created</TableHead>
                    <TableHead className="text-[#65B32E] font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levels.map((level: Level) => (
                    <TableRow
                      key={level.id}
                      className="border-[#65B32E]/20 hover:bg-[#65B32E]/5"
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-[#65B32E] text-[#65B32E] font-semibold"
                        >
                          Level {level.levelNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-[#65B32E]">{level.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {level.description || (
                          <span className="text-muted-foreground italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#65B32E]/30 text-[#65B32E]">
                          {level.memberCount} {level.memberCount === 1 ? "member" : "members"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(level.createdAt), "MMM d, yyyy")}
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

