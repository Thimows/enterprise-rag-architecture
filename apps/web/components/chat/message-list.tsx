"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-3xl px-4">
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
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
