"use client"

import { useEffect, useRef } from "react"
import { MessageBubble } from "@/components/chat/message-bubble"
import { StreamingMessage } from "@/components/chat/streaming-message"
import { ThinkingIndicator } from "@/components/chat/thinking-indicator"
import type { ChatMessage, Citation } from "@/lib/types"

interface MessageListProps {
  messages: ChatMessage[]
  streamingContent: string
  isStreaming: boolean
  thinkingContent: string
  isThinking: boolean
  citations: Citation[]
  onCitationHover?: (citation: Citation | null) => void
  onCitationClick?: (citation: Citation) => void
}

export function MessageList({
  messages,
  streamingContent,
  isStreaming,
  thinkingContent,
  isThinking,
  citations,
  onCitationHover,
  onCitationClick,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, streamingContent, thinkingContent])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end px-4 pb-6">
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
        {isStreaming && (
          <MessageBubble
            message={{ role: "assistant", content: streamingContent }}
          >
            {thinkingContent && (
              <ThinkingIndicator
                content={thinkingContent}
                isThinking={isThinking}
              />
            )}
            {streamingContent ? (
              <StreamingMessage
                content={streamingContent}
                citations={citations}
                onCitationHover={onCitationHover}
                onCitationClick={onCitationClick}
              />
            ) : !thinkingContent ? (
              <PulsingDots />
            ) : null}
          </MessageBubble>
        )}
      </div>
    </div>
  )
}

function PulsingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
    </div>
  )
}
