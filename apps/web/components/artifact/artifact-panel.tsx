"use client"

import { FileText, X } from "lucide-react"
import type { Citation } from "@/lib/types"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

interface ArtifactPanelProps {
  citation: Citation | null
  onClose: () => void
}

export function ArtifactPanel({ citation, onClose }: ArtifactPanelProps) {
  return (
    <Sheet open={!!citation} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            <span className="truncate">{citation?.documentName}</span>
          </SheetTitle>
        </SheetHeader>
        {citation && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Source [{citation.number}]</Badge>
              {citation.pageNumber > 0 && (
                <Badge variant="outline">Page {citation.pageNumber}</Badge>
              )}
              {citation.relevanceScore > 0 && (
                <Badge variant="outline">
                  Score: {(citation.relevanceScore * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
            <Separator />
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {citation.chunkText}
                </p>
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
