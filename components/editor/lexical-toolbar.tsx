"use client"

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
} from "lexical"
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list"
import { TOGGLE_LINK_COMMAND } from "@lexical/link"
import {
  $isHeadingNode,
  $createHeadingNode,
  $createQuoteNode,
  HeadingTagType,
} from "@lexical/rich-text"
import { $createCodeNode, $isCodeNode } from "@lexical/code"
import { $setBlocksType } from "@lexical/selection"
import { $isListNode, ListNode } from "@lexical/list"
import { $createParagraphNode } from "lexical"
import { useCallback, useEffect, useState } from "react"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

type TextFormatType = "bold" | "italic" | "underline" | "strikethrough" | "code"

export function LexicalToolbar() {
  const [editor] = useLexicalComposerContext()
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [blockType, setBlockType] = useState<string>("paragraph")

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"))
      setIsItalic(selection.hasFormat("italic"))
      setIsUnderline(selection.hasFormat("underline"))
      setIsStrikethrough(selection.hasFormat("strikethrough"))
      setIsCode(selection.hasFormat("code"))

      // Get block type
      const anchorNode = selection.anchor.getNode()
      const element = anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow()
      const elementKey = element.getKey()
      const elementDOM = editor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = element.getParent()
          const type = parentList ? parentList.getListType() : element.getListType()
          setBlockType(type)
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : $isCodeNode(element) ? "code" : element.getType()
          setBlockType(type)
        }
      }
    }
  }, [editor])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar()
      })
    })
  }, [editor, updateToolbar])

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
  }

  const formatHeading = (headingSize: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize))
      }
    })
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode())
      }
    })
  }

  const formatAlign = (align: "left" | "center" | "right") => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align)
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b border-[#65B32E]/20 bg-[#65B32E]/5 rounded-t-md flex-wrap">
      {/* Text Formatting */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("bold")}
        className={`h-8 w-8 p-0 ${isBold ? "bg-[#65B32E]/20" : ""}`}
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} className={isBold ? "text-[#65B32E]" : ""} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("italic")}
        className={`h-8 w-8 p-0 ${isItalic ? "bg-[#65B32E]/20" : ""}`}
        title="Italic (Ctrl+I)"
      >
        <Italic size={16} className={isItalic ? "text-[#65B32E]" : ""} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("underline")}
        className={`h-8 w-8 p-0 ${isUnderline ? "bg-[#65B32E]/20" : ""}`}
        title="Underline (Ctrl+U)"
      >
        <Underline size={16} className={isUnderline ? "text-[#65B32E]" : ""} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("strikethrough")}
        className={`h-8 w-8 p-0 ${isStrikethrough ? "bg-[#65B32E]/20" : ""}`}
        title="Strikethrough"
      >
        <Strikethrough size={16} className={isStrikethrough ? "text-[#65B32E]" : ""} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatText("code")}
        className={`h-8 w-8 p-0 ${isCode ? "bg-[#65B32E]/20" : ""}`}
        title="Inline Code"
      >
        <Code size={16} className={isCode ? "text-[#65B32E]" : ""} />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Headings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            <Heading1 size={16} className="mr-1" />
            <span className="text-xs">
              {blockType === "h1" ? "H1" : blockType === "h2" ? "H2" : blockType === "h3" ? "H3" : "Text"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-white border-[#65B32E]/20">
          <DropdownMenuItem onClick={formatParagraph} className="hover:bg-[#65B32E]/10">
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading("h1")} className="hover:bg-[#65B32E]/10">
            <Heading1 size={16} className="mr-2" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading("h2")} className="hover:bg-[#65B32E]/10">
            <Heading2 size={16} className="mr-2" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading("h3")} className="hover:bg-[#65B32E]/10">
            <Heading3 size={16} className="mr-2" />
            Heading 3
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatQuote} className="hover:bg-[#65B32E]/10">
            <Quote size={16} className="mr-2" />
            Quote
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatCode} className="hover:bg-[#65B32E]/10">
            <Code size={16} className="mr-2" />
            Code Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }}
        className="h-8 w-8 p-0"
        title="Bullet List"
      >
        <List size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }}
        className="h-8 w-8 p-0"
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatAlign("left")}
        className="h-8 w-8 p-0"
        title="Align Left"
      >
        <AlignLeft size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatAlign("center")}
        className="h-8 w-8 p-0"
        title="Align Center"
      >
        <AlignCenter size={16} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => formatAlign("right")}
        className="h-8 w-8 p-0"
        title="Align Right"
      >
        <AlignRight size={16} />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Link */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = prompt("Enter URL:")
          if (url) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
          } else {
            // Remove link if cancelled
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
          }
        }}
        className="h-8 w-8 p-0"
        title="Insert Link"
      >
        <Link size={16} />
      </Button>
    </div>
  )
}

