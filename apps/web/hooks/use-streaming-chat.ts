"use client"

import { useState, useRef, useCallback } from "react"
import { streamChat } from "@/lib/api-client"
import type { ChatMessage, Citation } from "@/lib/types"

interface UseStreamingChatOptions {
  organizationId: string
  onUserMessage?: (content: string) => void
  onAssistantComplete?: (content: string, citations: Citation[]) => void
}

export function useStreamingChat({
  organizationId,
  onUserMessage,
  onAssistantComplete,
}: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [citations, setCitations] = useState<Citation[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isStreaming) return

      const userMessage: ChatMessage = { role: "user", content: query }
      const history = [...messages, userMessage]
      setMessages(history)
      setStreamingContent("")
      setCitations([])
      setIsStreaming(true)

      onUserMessage?.(query)

      const controller = new AbortController()
      abortRef.current = controller

      let accumulated = ""
      const newCitations: Citation[] = []

      try {
        for await (const event of streamChat(
          {
            organization_id: organizationId,
            query,
            conversation_history: messages,
          },
          controller.signal,
        )) {
          if (event.type === "chunk") {
            accumulated += event.content
            setStreamingContent(accumulated)
          } else if (event.type === "citation") {
            newCitations.push({
              number: event.number,
              documentId: event.source.document_id,
              documentName: event.source.document_name,
              documentUrl: event.source.document_url,
              pageNumber: event.source.page_number,
              chunkText: event.source.chunk_text,
              relevanceScore: event.source.relevance_score,
            })
            setCitations([...newCitations])
          } else if (event.type === "done") {
            break
          }
        }

        setMessages([
          ...history,
          { role: "assistant", content: accumulated },
        ])
        setStreamingContent("")

        onAssistantComplete?.(accumulated, newCitations)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages([
            ...history,
            {
              role: "assistant",
              content: "Sorry, an error occurred. Please try again.",
            },
          ])
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [messages, isStreaming, organizationId, onUserMessage, onAssistantComplete],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    setMessages,
    citations,
    setCitations,
    isStreaming,
    streamingContent,
    sendMessage,
    stop,
  }
}
