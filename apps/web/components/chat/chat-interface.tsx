"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { trpc } from "@/lib/trpc/client"
import { useStreamingChat } from "@/hooks/use-streaming-chat"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { EmptyState } from "@/components/chat/empty-state"
import { SourcesPane } from "@/components/citations/sources-pane"
import { ArtifactPanel } from "@/components/artifact/artifact-panel"
import type { ChatMessage, Citation } from "@/lib/types"

interface ChatInterfaceProps {
  organizationId: string
  chatId?: string
  initialMessages?: ChatMessage[]
  initialCitations?: Citation[]
  onFirstMessage?: (message: string) => void
  pendingMessage?: string
}

export function ChatInterface({
  organizationId,
  chatId,
  initialMessages = [],
  initialCitations = [],
  onFirstMessage,
  pendingMessage,
}: ChatInterfaceProps) {
  const addMessage = trpc.chat.addMessage.useMutation()

  const handleUserMessage = useCallback(
    (content: string) => {
      if (chatId) {
        addMessage.mutate({ chatId, role: "user", content })
      }
    },
    [chatId, addMessage],
  )

  const handleAssistantComplete = useCallback(
    (content: string, citations: Citation[]) => {
      if (chatId) {
        addMessage.mutate({
          chatId,
          role: "assistant",
          content,
          citations: citations.map((c) => ({
            number: c.number,
            documentId: c.documentId || undefined,
            documentName: c.documentName,
            pageNumber: c.pageNumber || undefined,
            chunkText: c.chunkText,
            relevanceScore: c.relevanceScore || undefined,
          })),
        })
      }
    },
    [chatId, addMessage],
  )

  const {
    messages,
    setMessages,
    citations,
    setCitations,
    isStreaming,
    streamingContent,
    sendMessage,
    stop,
  } = useStreamingChat({
    organizationId,
    onUserMessage: handleUserMessage,
    onAssistantComplete: handleAssistantComplete,
  })

  const [hoveredCitation, setHoveredCitation] = useState<Citation | null>(null)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const pendingSent = useRef(false)

  // Initialize with existing messages
  if (initialMessages.length > 0 && messages.length === 0) {
    setMessages(initialMessages)
    setCitations(initialCitations)
  }

  // Auto-send pending message from new chat creation
  useEffect(() => {
    if (pendingMessage && !pendingSent.current) {
      pendingSent.current = true
      sendMessage(pendingMessage)
    }
  }, [pendingMessage, sendMessage])

  function handleSend(query: string) {
    if (messages.length === 0 && onFirstMessage) {
      onFirstMessage(query)
      return // Don't stream here — the chat page will handle it after navigation
    }
    sendMessage(query)
  }

  const showEmpty = messages.length === 0 && !isStreaming
  const lastAssistantCitations =
    citations.length > 0 ? citations : initialCitations

  return (
    <div className="flex flex-1 flex-col">
      {showEmpty ? (
        <EmptyState />
      ) : (
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          citations={lastAssistantCitations}
          onCitationHover={setHoveredCitation}
          onCitationClick={setSelectedCitation}
        />
      )}
      {!isStreaming && lastAssistantCitations.length > 0 && (
        <SourcesPane
          citations={lastAssistantCitations}
          hoveredCitation={hoveredCitation}
          onCitationClick={setSelectedCitation}
        />
      )}
      <MessageInput
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
      />
      <ArtifactPanel
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  )
}
