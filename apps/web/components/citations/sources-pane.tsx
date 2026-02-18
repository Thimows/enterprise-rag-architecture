"use client"

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Citation } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface SourcesPaneProps {
  citations: Citation[]
  hoveredCitation: Citation | null
  onCitationClick?: (citation: Citation) => void
}

export function SourcesPane({
  citations,
  hoveredCitation,
  onCitationClick,
}: SourcesPaneProps) {
  if (citations.length === 0) return null

  return (
    <div className="border-t px-4 py-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {citations.map((c) => (
            <Card
              key={c.number}
              className={cn(
                "w-64 shrink-0 cursor-pointer transition-colors",
                hoveredCitation?.number === c.number && "ring-2 ring-primary",
              )}
              onClick={() => onCitationClick?.(c)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {c.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <FileText className="size-3 shrink-0 text-muted-foreground" />
                      <p className="truncate text-xs font-medium">
                        {c.documentName}
                      </p>
                    </div>
                    {c.pageNumber > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Page {c.pageNumber}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {c.chunkText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
