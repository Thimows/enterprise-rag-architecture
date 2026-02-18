import type { ChatStreamRequest, SSEEvent } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001/api/v1"

export async function* streamChat(
  request: ChatStreamRequest,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Chat stream failed: ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data: ")) continue
      const data = trimmed.slice(6)
      if (!data) continue
      try {
        yield JSON.parse(data) as SSEEvent
      } catch {
        // skip malformed events
      }
    }
  }
}

export async function uploadDocument(
  file: File,
  organizationId: string,
  folderId: string,
): Promise<{ document_id: string; status: string; message: string }> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("organization_id", organizationId)
  formData.append("folder_id", folderId)

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  return response.json()
}

export async function listDocuments(
  organizationId: string,
  folderId?: string,
): Promise<DocumentInfo[]> {
  const params = new URLSearchParams({ organization_id: organizationId })
  if (folderId) params.set("folder_id", folderId)

  const response = await fetch(`${API_URL}/documents?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to list documents: ${response.statusText}`)
  }

  return response.json()
}

interface DocumentInfo {
  name: string
  size: number
  content_type: string
  organization_id: string
  folder_id: string
}
