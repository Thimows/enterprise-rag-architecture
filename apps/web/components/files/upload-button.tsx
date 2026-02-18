"use client"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { uploadDocument } from "@/lib/api-client"

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

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        await uploadDocument(file, organizationId, folderId)
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
        <Upload className="mr-2 size-4" />
        {uploading ? "Uploading..." : "Upload"}
      </Button>
    </>
  )
}
