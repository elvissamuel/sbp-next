"use client"

import { useMemo, useRef, type ComponentRef } from "react"
import JoditEditor from "jodit-react"

interface JoditLessonEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function JoditLessonEditor({ value, onChange, disabled = false }: JoditLessonEditorProps) {
  const editorRef = useRef<ComponentRef<typeof JoditEditor>>(null)

  const config = useMemo(
    () => ({
      readonly: disabled,
      toolbarAdaptive: false,
      toolbarSticky: false,
      height: 360,
      placeholder: "Start writing lesson content...",
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      defaultActionOnPaste: "insert_as_html" as const,
      defaultActionOnPasteFromWord: "insert_as_html" as const,
      buttons:
        "bold,italic,underline,strikethrough,|,ul,ol,|,fontsize,paragraph,|,brush,forecolor,backcolor,|,link,|,undo,redo,|,hr,|,source",
    }),
    [disabled]
  )

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <JoditEditor
        ref={editorRef}
        value={value}
        config={config}
        onChange={(newContent) => onChange(newContent)}
        onBlur={(newContent) => onChange(newContent)}
      />
    </div>
  )
}
