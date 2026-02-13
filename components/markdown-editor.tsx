"use client"

import type React from "react"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Edit } from "lucide-react"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter markdown content...",
  rows = 12,
  disabled = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")

  const renderMarkdown = (content: string) => {
    if (!content.trim()) {
      return (
        <div className="text-sm text-muted-foreground italic p-4">
          No content to preview. Start typing in the editor tab.
        </div>
      )
    }

    const lines = content.split("\n")
    const elements: React.ReactElement[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLang = ""
    let currentList: { type: "ul" | "ol"; items: string[] } | null = null

    const flushList = () => {
      if (currentList && currentList.items.length > 0) {
        const ListTag = currentList.type
        elements.push(
          <ListTag
            key={`list-${elements.length}`}
            className={`mb-3 ${currentList.type === "ol" ? "list-decimal" : "list-disc"} ml-6`}
          >
            {currentList.items.map((item, idx) => (
              <li key={idx} className="text-foreground mb-1">
                {item}
              </li>
            ))}
          </ListTag>
        )
        currentList = null
      }
    }

    lines.forEach((line, i) => {
      // Handle code blocks
      if (line.trim().startsWith("```")) {
        flushList()
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre
              key={`code-${i}`}
              className="bg-muted p-4 rounded-md overflow-x-auto my-4 border border-border/50"
            >
              <code className="text-sm font-mono text-foreground whitespace-pre">
                {codeBlockContent.join("\n")}
              </code>
            </pre>
          )
          codeBlockContent = []
          inCodeBlock = false
        } else {
          // Start code block
          inCodeBlock = true
          codeBlockLang = line.trim().replace("```", "").trim()
          return
        }
      } else if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }

      // Headers
      if (line.startsWith("# ")) {
        flushList()
        elements.push(
          <h1 key={i} className="text-3xl font-bold mt-6 mb-4 text-foreground first:mt-0">
            {line.replace("# ", "")}
          </h1>
        )
        return
      }
      if (line.startsWith("## ")) {
        flushList()
        elements.push(
          <h2 key={i} className="text-2xl font-bold mt-5 mb-3 text-foreground">
            {line.replace("## ", "")}
          </h2>
        )
        return
      }
      if (line.startsWith("### ")) {
        flushList()
        elements.push(
          <h3 key={i} className="text-xl font-semibold mt-4 mb-2 text-foreground">
            {line.replace("### ", "")}
          </h3>
        )
        return
      }
      if (line.startsWith("#### ")) {
        flushList()
        elements.push(
          <h4 key={i} className="text-lg font-semibold mt-3 mb-2 text-foreground">
            {line.replace("#### ", "")}
          </h4>
        )
        return
      }

      // Lists
      const bulletMatch = line.match(/^[\s]*[-*] (.+)$/)
      const orderedMatch = line.match(/^[\s]*\d+\. (.+)$/)
      
      if (bulletMatch || orderedMatch) {
        const listItem = bulletMatch ? bulletMatch[1] : orderedMatch![1]
        const isOrdered = !!orderedMatch
        
        if (currentList && currentList.type === (isOrdered ? "ol" : "ul")) {
          // Continue current list
          currentList.items.push(listItem)
        } else {
          // Start new list
          flushList()
          currentList = {
            type: isOrdered ? "ol" : "ul",
            items: [listItem],
          }
        }
        return
      }

      // If we hit a non-list line, flush any current list
      flushList()

      // Bold text (**text**)
      if (line.includes("**")) {
        const parts = line.split(/(\*\*.*?\*\*)/g)
        const formattedLine = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={pIdx} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
          }
          return <span key={pIdx}>{part}</span>
        })

        if (line.trim()) {
          elements.push(
            <p key={i} className="text-foreground mb-3 leading-relaxed">
              {formattedLine}
            </p>
          )
        }
        return
      }

      // Inline code (`code`)
      if (line.includes("`") && !line.trim().startsWith("```")) {
        const parts = line.split(/(`[^`]+`)/g)
        const formattedLine = parts.map((part, pIdx) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code
                key={pIdx}
                className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground"
              >
                {part.slice(1, -1)}
              </code>
            )
          }
          return <span key={pIdx}>{part}</span>
        })

        if (line.trim()) {
          elements.push(
            <p key={i} className="text-foreground mb-3 leading-relaxed">
              {formattedLine}
            </p>
          )
        }
        return
      }

      // Regular paragraphs
      if (line.trim()) {
        elements.push(
          <p key={i} className="text-foreground mb-3 leading-relaxed">
            {line}
          </p>
        )
      } else {
        // Empty line for spacing
        elements.push(<br key={i} />)
      }
    })

    // Flush any remaining list
    flushList()

    // Close any open code block
    if (inCodeBlock && codeBlockContent.length > 0) {
      elements.push(
        <pre
          key="code-final"
          className="bg-muted p-4 rounded-md overflow-x-auto my-4 border border-border/50"
        >
          <code className="text-sm font-mono text-foreground whitespace-pre">
            {codeBlockContent.join("\n")}
          </code>
        </pre>
      )
    }

    return elements
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="edit" className="flex items-center gap-2">
          <Edit size={16} />
          Edit
        </TabsTrigger>
        <TabsTrigger value="preview" className="flex items-center gap-2">
          <Eye size={16} />
          Preview
        </TabsTrigger>
      </TabsList>
      <TabsContent value="edit" className="mt-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="font-mono text-sm"
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-4">
        <Card className="border-border/50">
          <CardContent className="pt-6 p-6 h-[600px] overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(value)}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

