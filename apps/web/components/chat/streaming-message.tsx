"use client"

import { useMemo } from "react"
import { Streamdown } from "streamdown"
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
  // Pre-process content: wrap [N] citation patterns in custom <cite> tags
  // so Streamdown renders them via our CitationBubble component
  const processed = useMemo(() => {
    return content.replace(/\[(\d+)\]/g, '<cite data-number="$1">[$1]</cite>')
  }, [content])

  return (
    <div className="text-sm leading-relaxed">
      <Streamdown
        animated
        isAnimating={!isComplete}
        allowedTags={{
          cite: ["data-number"],
        }}
        components={{
          cite: (props) => {
            const dataNumber = (
              props as unknown as { "data-number": string }
            )["data-number"]
            const number = parseInt(dataNumber, 10)
            if (isNaN(number)) return null
            const citation = citations.find((c) => c.number === number)
            return (
              <CitationBubble
                number={number}
                citation={citation}
                onHover={onCitationHover}
                onClick={onCitationClick}
              />
            )
          },
        }}
      >
        {processed}
      </Streamdown>
    </div>
  )
}
