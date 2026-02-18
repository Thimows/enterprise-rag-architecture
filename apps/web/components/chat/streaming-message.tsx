"use client"

import { useMemo } from "react"
import { Streamdown } from "streamdown"
import "streamdown/styles.css"
import type { Citation } from "@/lib/types"
import { CitationBubble } from "@/components/citations/citation-bubble"

interface StreamingMessageProps {
  content: string
  citations: Citation[]
  isComplete?: boolean
  onCitationClick?: (citation: Citation) => void
}

export function StreamingMessage({
  content,
  citations,
  isComplete,
  onCitationClick,
}: StreamingMessageProps) {
  // Replace [N] citation markers with markdown links [N](#cite-N)
  // Streamdown parses these natively — no rehype-raw or allowedTags needed
  const processed = useMemo(() => {
    return content.replace(/\[(\d+)\]/g, "[$1](#cite-$1)")
  }, [content])

  return (
    <div className="text-sm leading-relaxed">
      <Streamdown
        mode={isComplete ? "static" : "streaming"}
        animated={{ animation: "blurIn", duration: 250, easing: "ease-out" }}
        isAnimating={!isComplete}
        parseIncompleteMarkdown
        components={{
          a: ({ href, ...rest }) => {
            const match = (href ?? "").match(/^#cite-(\d+)$/)
            if (!match) {
              return <a href={href} {...rest} />
            }
            const number = parseInt(match[1]!, 10)
            const citation = citations.find((c) => c.number === number)
            return (
              <CitationBubble
                number={number}
                citation={citation}
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
