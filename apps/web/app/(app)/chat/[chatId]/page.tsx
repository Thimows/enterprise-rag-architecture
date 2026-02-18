import { ChatView } from "./chat-view"

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { chatId } = await params
  const { q } = await searchParams
  return <ChatView chatId={chatId} pendingMessage={q} />
}
