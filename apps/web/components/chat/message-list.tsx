"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "@/components/chat/message-bubble"
import { StreamingMessage } from "@/components/chat/streaming-message"
import type { ChatMessage, Citation } from "@/lib/types"

interface MessageListProps {
  messages: ChatMessage[]
  streamingContent: string
  isStreaming: boolean
  citations: Citation[]
  onCitationHover?: (citation: Citation | null) => void
  onCitationClick?: (citation: Citation) => void
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  citations,
  onCitationHover,
  onCitationClick,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streamingContent])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end px-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg}>
            {msg.role === "assistant" ? (
              <StreamingMessage
                content={msg.content}
                citations={citations}
                isComplete
                onCitationHover={onCitationHover}
                onCitationClick={onCitationClick}
              />
            ) : undefined}
          </MessageBubble>
        ))}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{ role: "assistant", content: streamingContent }}
          >
            <StreamingMessage
              content={streamingContent}
              citations={citations}
              onCitationHover={onCitationHover}
              onCitationClick={onCitationClick}
            />
          </MessageBubble>
        )}
      </div>
    </div>
  )
}
