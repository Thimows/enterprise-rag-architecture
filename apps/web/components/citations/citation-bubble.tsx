"use client"

import type { Citation } from "@/lib/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CitationBubbleProps {
  number: number
  citation?: Citation
  onHover?: (citation: Citation | null) => void
  onClick?: (citation: Citation) => void
}

export function CitationBubble({
  number,
  citation,
  onHover,
  onClick,
}: CitationBubbleProps) {
  const bubble = (
    <button
      type="button"
      className="mx-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
      onMouseEnter={() => citation && onHover?.(citation)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => citation && onClick?.(citation)}
    >
      {number}
    </button>
  )

  if (!citation) return bubble

  return (
    <Tooltip>
      <TooltipTrigger asChild>{bubble}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs font-medium">{citation.documentName}</p>
        {citation.pageNumber > 0 && (
          <p className="text-xs text-muted-foreground">
            Page {citation.pageNumber}
          </p>
        )}
        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
          {citation.chunkText}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
