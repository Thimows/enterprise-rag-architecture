"use client"

import {
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const statusConfig: Record<string, {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: React.ReactNode
}> = {
  uploading: {
    label: "Uploading",
    variant: "outline",
    icon: <Loader2 className="size-3 animate-spin" />,
  },
  uploaded: {
    label: "Processing",
    variant: "secondary",
    icon: <Loader2 className="size-3 animate-spin" />,
  },
  processing: {
    label: "Processing",
    variant: "secondary",
    icon: <Loader2 className="size-3 animate-spin" />,
  },
  indexed: {
    label: "Ready",
    variant: "default",
    icon: <CheckCircle className="size-3" />,
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: <XCircle className="size-3" />,
  },
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentTableProps {
  documents: DocumentRow[]
  onDelete?: (doc: DocumentRow) => void
}

export function DocumentTable({ documents, onDelete }: DocumentTableProps) {
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
          <TableHead className="w-10" />
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
              <Badge
                variant={statusConfig[doc.status]?.variant ?? "outline"}
                className="gap-1"
              >
                {statusConfig[doc.status]?.icon}
                {statusConfig[doc.status]?.label ?? doc.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(doc.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={() => onDelete?.(doc)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
