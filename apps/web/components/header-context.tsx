"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react"

interface HeaderContextValue {
  title: string
  actions: ReactNode
  setTitle: (title: string) => void
  setActions: (actions: ReactNode) => void
}

const HeaderContext = createContext<HeaderContextValue | null>(null)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Azure RAG")
  const [actions, setActions] = useState<ReactNode>(null)

  const stableSetTitle = useCallback((t: string) => setTitle(t), [])
  const stableSetActions = useCallback((a: ReactNode) => setActions(a), [])

  return (
    <HeaderContext value={{ title, actions, setTitle: stableSetTitle, setActions: stableSetActions }}>
      {children}
    </HeaderContext>
  )
}

export function useHeader() {
  const ctx = useContext(HeaderContext)
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider")
  return ctx
}
