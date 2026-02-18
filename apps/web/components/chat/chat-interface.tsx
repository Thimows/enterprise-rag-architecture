"use client"

import { useState, useCallback, useRef } from "react"
import { trpc } from "@/lib/trpc/client"
import { useStreamingChat } from "@/hooks/use-streaming-chat"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { EmptyState } from "@/components/chat/empty-state"
import { ArtifactPanel } from "@/components/artifact/artifact-panel"
import type { ChatMessage, Citation } from "@/lib/types"

interface ChatInterfaceProps {
  organizationId: string
  chatId?: string
  initialMessages?: ChatMessage[]
  onFirstMessage?: (message: string) => Promise<string>
}

export function ChatInterface({
  organizationId,
  chatId,
  initialMessages = [],
  onFirstMessage,
}: ChatInterfaceProps) {
  const chatIdRef = useRef(chatId)
  if (chatId) chatIdRef.current = chatId

  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])

  const { data: folders } = trpc.folder.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  const addMessage = trpc.chat.addMessage.useMutation()

  const handleUserMessage = useCallback(
    (content: string) => {
      const id = chatIdRef.current
      if (id) {
        addMessage.mutate({ chatId: id, role: "user", content })
      }
    },
    [addMessage],
  )

  const handleAssistantComplete = useCallback(
    (content: string, citations: Citation[]) => {
      const id = chatIdRef.current
      if (id) {
        addMessage.mutate({
          chatId: id,
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
    [addMessage],
  )

  const {
    messages,
    setMessages,
    citations,
    isStreaming,
    streamingContent,
    thinkingContent,
    isThinking,
    sendMessage,
    stop,
  } = useStreamingChat({
    organizationId,
    folderIds: selectedFolderIds.length > 0 ? selectedFolderIds : undefined,
    onUserMessage: handleUserMessage,
    onAssistantComplete: handleAssistantComplete,
  })

  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)

  // Initialize with existing messages (which now include per-message citations)
  if (initialMessages.length > 0 && messages.length === 0) {
    setMessages(initialMessages)
  }

  async function handleSend(query: string) {
    if (messages.length === 0 && onFirstMessage) {
      const newChatId = await onFirstMessage(query)
      chatIdRef.current = newChatId
    }
    sendMessage(query)
  }

  const showEmpty = messages.length === 0 && !isStreaming

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showEmpty ? (
        <EmptyState />
      ) : (
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          thinkingContent={thinkingContent}
          isThinking={isThinking}
          streamingCitations={citations}
          onCitationClick={setSelectedCitation}
        />
      )}
      <MessageInput
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        folders={folders}
        selectedFolderIds={selectedFolderIds}
        onFolderChange={setSelectedFolderIds}
      />
      <ArtifactPanel
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  )
}
