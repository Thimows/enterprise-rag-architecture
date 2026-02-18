import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { FilesClient } from "./files-client"

export default async function FilesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/sign-in")

  const activeOrgId = session.session.activeOrganizationId

  if (!activeOrgId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-lg font-medium">No workspace selected</p>
          <p className="text-sm text-muted-foreground">
            Select or create a workspace from the sidebar.
          </p>
        </div>
      </div>
    )
  }

  return <FilesClient organizationId={activeOrgId} />
}
