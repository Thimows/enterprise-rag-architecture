import { MessageSquare } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <MessageSquare className="size-8 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-medium">
          Ask a question about your documents
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload documents and ask questions. Answers are grounded in your data
          with inline citations.
        </p>
      </div>
    </div>
  )
}
