import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/types"

interface MessageBubbleProps {
  message: ChatMessage
  children?: React.ReactNode
}

export function MessageBubble({ message, children }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn("flex gap-3 py-4", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted",
        )}
      >
        {children ?? (
          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        )}
      </div>
    </div>
  )
}
