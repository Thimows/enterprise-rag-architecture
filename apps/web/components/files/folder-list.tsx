"use client"

import { Folder, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FolderItem {
  id: string
  name: string
  description: string | null
}

interface FolderListProps {
  folders: FolderItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function FolderList({
  folders,
  selectedId,
  onSelect,
  onDelete,
}: FolderListProps) {
  if (folders.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No folders yet. Create one to organize your documents.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {folders.map((f) => (
        <div
          key={f.id}
          className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
            selectedId === f.id
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted",
          )}
          onClick={() => onSelect(f.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Folder className="size-4 shrink-0" />
            <span className="truncate">{f.name}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(f.id)
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
