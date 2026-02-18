"use client"

import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DocumentRow {
  id: string
  name: string
  fileType: string
  fileSize: number
  status: string
  createdAt: string
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  uploading: "outline",
  processing: "secondary",
  indexed: "default",
  failed: "destructive",
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentTable({ documents }: { documents: DocumentRow[] }) {
  if (documents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No documents in this folder yet. Upload files to get started.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uploaded</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                {doc.name}
              </div>
            </TableCell>
            <TableCell className="uppercase text-muted-foreground">
              {doc.fileType}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatSize(doc.fileSize)}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[doc.status] ?? "outline"}>
                {doc.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(doc.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
