"use client"

import { useState, useRef } from "react"
import { ArrowUp, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface MessageInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: MessageInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue("")
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (isStreaming) return
      handleSubmit()
    }
  }

  return (
    <div className="shrink-0 border-t bg-background p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          rows={1}
          className="min-h-[44px] max-h-[200px] resize-none"
          disabled={disabled}
        />
        {isStreaming ? (
          <Button size="icon" variant="outline" onClick={onStop}>
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
