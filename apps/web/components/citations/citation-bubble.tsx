"use client"

import { useCallback } from "react"
import {
  FileText,
  FileSpreadsheet,
  File,
  FolderOpen,
  ExternalLink,
} from "lucide-react"
import type { Citation } from "@/lib/types"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"

interface CitationBubbleProps {
  number: number
  citation?: Citation
  onClick?: (citation: Citation) => void
}

/** Extract just the filename from a blob path like "orgId/folderId/file.pdf" */
function getFileName(documentName: string): string {
  const parts = documentName.split("/")
  return parts[parts.length - 1] ?? documentName
}

function FileIcon({ name, fileType }: { name: string; fileType?: string }) {
  const lower = (fileType ?? name).toLowerCase()
  if (lower.includes("pdf")) return <FileText className="size-3.5 shrink-0 text-red-500" />
  if (lower.includes("word") || lower.includes("docx"))
    return <FileSpreadsheet className="size-3.5 shrink-0 text-blue-500" />
  return <File className="size-3.5 shrink-0 text-muted-foreground" />
}

const BLOCK_TAGS = new Set(["P", "LI", "BLOCKQUOTE", "TD", "H1", "H2", "H3", "H4", "H5", "H6", "DIV"])
const HIGHLIGHT_CLASS = "citation-highlight"

function findBlockParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  while (node) {
    if (BLOCK_TAGS.has(node.tagName)) return node
    node = node.parentElement
  }
  return null
}

export function CitationBubble({
  number,
  citation,
  onClick,
}: CitationBubbleProps) {
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const block = findBlockParent(e.currentTarget)
    block?.classList.add(HIGHLIGHT_CLASS)
  }, [])

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const block = findBlockParent(e.currentTarget)
    block?.classList.remove(HIGHLIGHT_CLASS)
  }, [])

  const bubble = (
    <button
      type="button"
      className="citation-bubble mx-0.5 inline-flex size-5 cursor-pointer items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
      onClick={() => citation && onClick?.(citation)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {number}
    </button>
  )

  if (!citation) return bubble

  const displayName = getFileName(citation.documentName)

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{bubble}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 p-3" align="start">
        <div className="space-y-2">
          {/* Header: icon + document name */}
          <div className="flex items-start gap-2">
            <div className="shrink-0 pt-0.5">
              <FileIcon name={displayName} fileType={citation.fileType} />
            </div>
            <p className="text-sm font-medium leading-tight">
              {displayName}
            </p>
          </div>

          {/* Folder + page badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {citation.folderName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FolderOpen className="size-3" />
                <span>{citation.folderName}</span>
              </div>
            )}
            {citation.pageNumber > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Page {citation.pageNumber}
              </Badge>
            )}
          </div>

          {/* Snippet */}
          {citation.chunkText && (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {citation.chunkText}
            </p>
          )}

          {/* View source link */}
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
            onClick={() => onClick?.(citation)}
          >
            <ExternalLink className="size-3" />
            View source
          </button>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
