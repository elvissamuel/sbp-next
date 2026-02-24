"use client"

import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html"
import { $getRoot, $createParagraphNode, $isElementNode } from "lexical"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { LinkNode } from "@lexical/link"
import { ListNode, ListItemNode } from "@lexical/list"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { useEffect, useState } from "react"
import { LexicalToolbar } from "./lexical-toolbar"
import { LexicalPlugins } from "./lexical-plugins"

const theme = {
  // Base styles
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "bg-muted px-1 py-0.5 rounded font-mono text-sm",
  },
  heading: {
    h1: "text-4xl font-bold mb-4 mt-6",
    h2: "text-3xl font-bold mb-3 mt-5",
    h3: "text-2xl font-bold mb-2 mt-4",
    h4: "text-xl font-bold mb-2 mt-3",
    h5: "text-lg font-bold mb-1 mt-2",
    h6: "text-base font-bold mb-1 mt-2",
  },
  list: {
    nested: {
      listitem: "ml-4",
    },
    ol: "list-decimal list-inside mb-2",
    ul: "list-disc list-inside mb-2",
    listitem: "mb-1",
  },
  link: "text-[#65B32E] underline hover:text-[#65B32E]/80",
  code: "bg-muted p-4 rounded-lg font-mono text-sm block overflow-x-auto mb-4",
  quote: "border-l-4 border-[#65B32E] pl-4 italic my-4 text-muted-foreground",
  paragraph: "mb-2",
}

function onError(error: Error) {
  console.error("Lexical editor error:", error)
}

interface LexicalEditorProps {
  initialEditorState?: string | null // Can be HTML string or Lexical JSON string
  onChange?: (editorState: string, format: "html" | "json") => void
  placeholder?: string
  editable?: boolean
  className?: string
  showToolbar?: boolean
  outputFormat?: "html" | "json" // Output format for onChange
  transparent?: boolean // If true, removes background and border
}

// Plugin to sync editor state with parent
function OnChangePluginInternal({ 
  onChange, 
  outputFormat = "html" 
}: { 
  onChange?: (editorState: string, format: "html" | "json") => void
  outputFormat?: "html" | "json"
}) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        if (outputFormat === "json") {
          const jsonString = JSON.stringify(editorState.toJSON())
          onChange?.(jsonString, "json")
        } else {
          const htmlString = $generateHtmlFromNodes(editor, null)
          onChange?.(htmlString, "html")
        }
      })
    })
  }, [editor, onChange, outputFormat])
}

// Plugin to load initial state
function InitialStatePlugin({ initialEditorState }: { initialEditorState?: string | null }) {
  const [editor] = useLexicalComposerContext()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (initialEditorState && !hasLoaded) {
      try {
        // Try to parse as JSON (Lexical state)
        const parsed = JSON.parse(initialEditorState)
        if (parsed && typeof parsed === "object" && parsed.root) {
          // It's a Lexical JSON state - use editor's parseEditorState method
          try {
            editor.setEditable(false)
            // Use editor.parseEditorState to parse the JSON state string
            const editorState = editor.parseEditorState(initialEditorState)
            editor.setEditorState(editorState)
            editor.setEditable(true)
            setHasLoaded(true)
            return
          } catch (error) {
            console.error("Error parsing Lexical editor state:", error)
            // Fall through to HTML parsing
          }
        }
      } catch {
        // Not JSON, treat as HTML
      }
      
      // Parse as HTML
      editor.update(() => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(initialEditorState, "text/html")
        const body = dom.body
        
        // Get nodes from body element (which contains the actual content)
        const nodes = $generateNodesFromDOM(editor, body)
        const root = $getRoot()
        root.clear()
        
        // Filter to only append valid root children (element nodes, not text nodes)
        // Root can only contain: paragraph, heading, list, quote, code, etc.
        const validNodes: any[] = []
        for (const node of nodes) {
          // Use $isElementNode to check if it's a valid element node
          if ($isElementNode(node)) {
            validNodes.push(node)
          }
        }
        
        if (validNodes.length > 0) {
          // Append nodes one by one to avoid issues
          validNodes.forEach((node) => {
            try {
              root.append(node)
            } catch (error) {
              console.warn("Failed to append node to root:", error, "Node type:", node.getType())
            }
          })
        } else {
          // If no valid nodes, create an empty paragraph
          const paragraph = $createParagraphNode()
          root.append(paragraph)
        }
      })
      setHasLoaded(true)
    }
  }, [editor, initialEditorState, hasLoaded])

  return null
}

export function LexicalEditor({
  initialEditorState,
  onChange,
  placeholder = "Start typing...",
  editable = true,
  className = "",
  showToolbar = true,
  outputFormat = "html",
  transparent = false,
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: "LexicalEditor",
    theme,
    onError,
    editable,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      LinkNode,
    ],
  }

  return (
    <div className={`lexical-editor-wrapper ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        {showToolbar && <LexicalToolbar />}
        <div className={`relative rounded-md min-h-[200px] ${
          transparent 
            ? "bg-transparent border-none shadow-none" 
            : "border border-[#65B32E]/30 bg-white focus-within:border-[#65B32E] focus-within:ring-2 focus-within:ring-[#65B32E]/20"
        }`}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="outline-none px-4 py-3 min-h-[200px] prose prose-sm max-w-none" />
            }
            placeholder={
              <div className="absolute top-3 left-4 text-muted-foreground pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <LexicalPlugins />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <LinkPlugin />
          <ListPlugin />
          <OnChangePluginInternal onChange={onChange} outputFormat={outputFormat} />
          <InitialStatePlugin initialEditorState={initialEditorState} />
        </div>
      </LexicalComposer>
    </div>
  )
}

