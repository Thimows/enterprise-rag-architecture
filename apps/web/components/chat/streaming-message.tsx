"use client"

import { useMemo } from "react"
import type { Citation } from "@/lib/types"
import { CitationBubble } from "@/components/citations/citation-bubble"

interface StreamingMessageProps {
  content: string
  citations: Citation[]
  isComplete?: boolean
  onCitationHover?: (citation: Citation | null) => void
  onCitationClick?: (citation: Citation) => void
}

export function StreamingMessage({
  content,
  citations,
  isComplete,
  onCitationHover,
  onCitationClick,
}: StreamingMessageProps) {
  // Parse content into segments of text and citation references
  const segments = useMemo(() => {
    const parts: { type: "text" | "citation"; value: string; number?: number }[] = []
    const regex = /\[(\d+)\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: content.slice(lastIndex, match.index) })
      }
      parts.push({ type: "citation", value: match[0], number: parseInt(match[1]!, 10) })
      lastIndex = regex.lastIndex
    }

    if (lastIndex < content.length) {
      parts.push({ type: "text", value: content.slice(lastIndex) })
    }

    return parts
  }, [content])

  return (
    <div className="text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "citation" && seg.number != null) {
          const citation = citations.find((c) => c.number === seg.number)
          return (
            <CitationBubble
              key={i}
              number={seg.number}
              citation={citation}
              onHover={onCitationHover}
              onClick={onCitationClick}
            />
          )
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {seg.value}
          </span>
        )
      })}
      {!isComplete && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/60" />
      )}
    </div>
  )
}
