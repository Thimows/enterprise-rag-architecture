"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { useHeader } from "@/components/header-context"
import { FolderList } from "@/components/files/folder-list"
import { FolderCreateDialog } from "@/components/files/folder-create-dialog"
import { DocumentTable } from "@/components/files/document-table"
import { UploadButton } from "@/components/files/upload-button"
import { deleteDocument } from "@/lib/api-client"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export function FilesClient({
  organizationId,
  folderId,
}: {
  organizationId: string
  folderId?: string
}) {
  const selectedFolder = folderId ?? null
  const router = useRouter()
  const utils = trpc.useUtils()
  const { setTitle, setActions } = useHeader()

  const { data: folders, isPending: foldersLoading } =
    trpc.folder.list.useQuery()

  const { data: documents, isPending: docsLoading } =
    trpc.document.list.useQuery(
      selectedFolder ? { folderId: selectedFolder } : undefined,
      {
        enabled: !!selectedFolder,
        refetchInterval: (query) => {
          const docs = query.state.data
          const hasActive = docs?.some(
            (d) => d.status === "uploaded" || d.status === "processing",
          )
          return hasActive ? 3000 : false
        },
      },
    )

  const deleteFolder = trpc.folder.delete.useMutation({
    onSuccess: () => utils.folder.list.invalidate(),
  })

  const deleteDoc = trpc.document.delete.useMutation({
    onSuccess: () => utils.document.list.invalidate(),
  })

  useEffect(() => {
    setTitle("Files")
    setActions(
      <FolderCreateDialog
        onCreated={(id) => {
          utils.folder.list.invalidate()
          router.push(`/files/${id}`)
        }}
      />,
    )
    return () => {
      setTitle("Azure RAG")
      setActions(null)
    }
  }, [setTitle, setActions, utils.folder.list, router])

  function handleDeleteFolder(id: string) {
    if (selectedFolder === id) router.push("/files")
    deleteFolder.mutate({ id })
  }

  async function handleDeleteDocument(doc: { id: string; name: string }) {
    if (!selectedFolder) return
    try {
      await deleteDocument(doc.id, organizationId, selectedFolder, doc.name)
    } catch {
      // blob/search cleanup is best-effort
    }
    deleteDoc.mutate({ id: doc.id })
  }

  return (
    <div className="flex flex-1 flex-col px-6">
      <div className="flex flex-1 gap-6">
        {/* Folder sidebar */}
        <div className="w-64 shrink-0 pt-6">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Folders
          </p>
          {foldersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <FolderList
              folders={folders ?? []}
              selectedId={selectedFolder}
              onSelect={(id) => router.push(`/files/${id}`)}
              onDelete={handleDeleteFolder}
            />
          )}
        </div>

        <Separator orientation="vertical" className="h-auto" />

        {/* Documents area */}
        <div className="flex-1 pt-6">
          {selectedFolder ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  {folders?.find((f) => f.id === selectedFolder)?.name ??
                    "Documents"}
                </h2>
                <UploadButton
                  organizationId={organizationId}
                  folderId={selectedFolder}
                  onUploaded={() =>
                    utils.document.list.invalidate()
                  }
                />
              </div>
              {docsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <DocumentTable
                  documents={(documents ?? []).map((d) => ({
                    ...d,
                    fileSize: Number(d.fileSize),
                    createdAt: String(d.createdAt),
                  }))}
                  onDelete={handleDeleteDocument}
                />
              )}
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select a folder to view its documents.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
