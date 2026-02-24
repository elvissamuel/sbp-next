"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { $getSelection, $isRangeSelection } from "lexical"
import { useEffect } from "react"
import { $createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link"
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list"
import { $createParagraphNode } from "lexical"

// Plugin to handle link toggle
export function LinkTogglePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      TOGGLE_LINK_COMMAND,
      (payload: string | null) => {
        if (payload === null) {
          // Remove link
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes()
              nodes.forEach((node) => {
                if ($isLinkNode(node)) {
                  const parent = node.getParent()
                  if (parent) {
                    node.replace($createParagraphNode())
                  }
                }
              })
            }
          })
        } else {
          // Create link
          editor.update(() => {
            const selection = $getSelection()
            if ($isRangeSelection(selection) && !selection.isCollapsed()) {
              const linkNode = $createLinkNode(payload)
              selection.insertNodes([linkNode])
            }
          })
        }
        return true
      },
      1
    )
  }, [editor])

  return null
}

// Export all plugins
export function LexicalPlugins() {
  return (
    <>
      <LinkTogglePlugin />
    </>
  )
}

