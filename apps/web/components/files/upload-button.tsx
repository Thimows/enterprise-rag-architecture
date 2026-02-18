"use client"

import { useRef, useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { uploadDocument } from "@/lib/api-client"
import { trpc } from "@/lib/trpc/client"

interface UploadButtonProps {
  organizationId: string
  folderId: string
  onUploaded: () => void
}

export function UploadButton({
  organizationId,
  folderId,
  onUploaded,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const createDoc = trpc.document.create.useMutation()

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        const result = await uploadDocument(file, organizationId, folderId)
        await createDoc.mutateAsync({
          id: result.document_id,
          name: file.name,
          folderId,
          blobUrl: `${organizationId}/${folderId}/${file.name}`,
          fileType: file.name.split(".").pop() ?? "",
          fileSize: file.size,
        })
      }
      onUploaded()
    } catch (err) {
      console.error("Upload failed:", err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.txt"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading ? "Uploading..." : "Upload"}
      </Button>
    </>
  )
}
