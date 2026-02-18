"use client"

import { useState, useRef } from "react"
import { ArrowUp, Check, FolderOpen, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface Folder {
  id: string
  name: string
}

interface MessageInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
  folders?: Folder[]
  selectedFolderIds?: string[]
  onFolderChange?: (ids: string[]) => void
}

export function MessageInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  folders = [],
  selectedFolderIds = [],
  onFolderChange,
}: MessageInputProps) {
  const [value, setValue] = useState("")
  const [open, setOpen] = useState(false)
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

  function toggleFolder(id: string) {
    if (selectedFolderIds.includes(id)) {
      onFolderChange?.(selectedFolderIds.filter((f) => f !== id))
    } else {
      onFolderChange?.([...selectedFolderIds, id])
    }
  }

  const hasFilter = selectedFolderIds.length > 0
  const showFolderFilter = !!onFolderChange

  return (
    <div className="shrink-0 border-t bg-background p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {showFolderFilter && hasFilter && (
          <div className="flex flex-wrap gap-1.5">
            {selectedFolderIds.map((id) => {
              const folder = folders.find((f) => f.id === id)
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="cursor-pointer gap-1 text-xs"
                  onClick={() => toggleFolder(id)}
                >
                  <FolderOpen className="size-3" />
                  {folder?.name ?? id}
                  <span className="ml-0.5 text-muted-foreground">&times;</span>
                </Badge>
              )
            })}
          </div>
        )}
        <div className="flex items-end gap-2">
          {showFolderFilter && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasFilter ? "default" : "outline"}
                  size="icon"
                  className="shrink-0"
                >
                  <FolderOpen className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search folders..." />
                  <CommandList>
                    <CommandEmpty>No folders found.</CommandEmpty>
                    <CommandGroup>
                      {folders.map((folder) => {
                        const selected = selectedFolderIds.includes(folder.id)
                        return (
                          <CommandItem
                            key={folder.id}
                            value={folder.name}
                            onSelect={() => toggleFolder(folder.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4 shrink-0",
                                selected ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {folder.name}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasFilter
                ? `Ask about ${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? "s" : ""}...`
                : "Ask a question..."
            }
            rows={1}
            className="min-h-7.5 max-h-[200px] resize-none"
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
    </div>
  )
}
