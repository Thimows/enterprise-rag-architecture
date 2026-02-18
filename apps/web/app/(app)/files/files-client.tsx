"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { FolderList } from "@/components/files/folder-list"
import { FolderCreateDialog } from "@/components/files/folder-create-dialog"
import { DocumentTable } from "@/components/files/document-table"
import { UploadButton } from "@/components/files/upload-button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

export function FilesClient({ organizationId }: { organizationId: string }) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const utils = trpc.useUtils()

  const { data: folders, isPending: foldersLoading } =
    trpc.folder.list.useQuery()

  const { data: documents, isPending: docsLoading } =
    trpc.document.list.useQuery(
      selectedFolder ? { folderId: selectedFolder } : undefined,
      { enabled: !!selectedFolder },
    )

  const deleteFolder = trpc.folder.delete.useMutation({
    onSuccess: () => utils.folder.list.invalidate(),
  })

  function handleDeleteFolder(id: string) {
    if (selectedFolder === id) setSelectedFolder(null)
    deleteFolder.mutate({ id })
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Files</h1>
        <FolderCreateDialog
          onCreated={() => utils.folder.list.invalidate()}
        />
      </div>

      <div className="flex flex-1 gap-6">
        {/* Folder sidebar */}
        <div className="w-64 shrink-0">
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
              onSelect={setSelectedFolder}
              onDelete={handleDeleteFolder}
            />
          )}
        </div>

        <Separator orientation="vertical" className="h-auto" />

        {/* Documents area */}
        <div className="flex-1">
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
