export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface Citation {
  number: number
  documentId: string
  documentName: string
  documentUrl: string
  pageNumber: number
  chunkText: string
  relevanceScore: number
}

export interface SSEChunkEvent {
  type: "chunk"
  content: string
}

export interface SSECitationEvent {
  type: "citation"
  number: number
  source: {
    document_id: string
    document_name: string
    document_url: string
    page_number: number
    chunk_text: string
    relevance_score: number
  }
}

export interface SSEDoneEvent {
  type: "done"
}

export type SSEEvent = SSEChunkEvent | SSECitationEvent | SSEDoneEvent

export interface ChatStreamRequest {
  organization_id: string
  query: string
  conversation_history: ChatMessage[]
  filters?: {
    folder_ids?: string[]
    document_names?: string[]
  }
  top_k?: number
}

export interface DocumentInfo {
  name: string
  size: number
  content_type: string
  organization_id: string
  folder_id: string
}
