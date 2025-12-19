"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wand2 } from "lucide-react"

interface QuizGeneratorModalProps {
  courseId: string
  onGenerate?: (config: any) => void
}

export function QuizGeneratorModal({ courseId, onGenerate }: QuizGeneratorModalProps) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState({
    questionCount: 10,
    difficulty: "medium",
    types: {
      multipleChoice: true,
      trueOrFalse: true,
      typeAnswer: false,
    },
  })

  const handleGenerate = async () => {
    // TODO: Call quiz generation API
    console.log("Generate quiz:", config)
    onGenerate?.(config)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wand2 size={16} className="mr-2" />
          Generate Quiz
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Quiz with AI</DialogTitle>
          <DialogDescription>Configure your quiz settings to generate questions automatically</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="questionCount">Number of Questions</Label>
            <Input
              id="questionCount"
              type="number"
              min="1"
              max="50"
              value={config.questionCount}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  questionCount: Number.parseInt(e.target.value),
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={config.difficulty}
              onValueChange={(value) => setConfig((prev) => ({ ...prev, difficulty: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Question Types</Label>
            <div className="space-y-2">
              {[
                { key: "multipleChoice", label: "Multiple Choice" },
                { key: "trueOrFalse", label: "True or False" },
                { key: "typeAnswer", label: "Type Answer" },
              ].map((type) => (
                <div key={type.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.key}
                    checked={config.types[type.key as keyof typeof config.types]}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        types: {
                          ...prev.types,
                          [type.key]: checked,
                        },
                      }))
                    }
                  />
                  <Label htmlFor={type.key} className="font-normal cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerate} className="flex-1">
              <Wand2 size={16} className="mr-2" />
              Generate Quiz
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
