"use client"

import { useState } from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function WorkspaceSwitcher() {
  const { data: orgs } = authClient.useListOrganizations()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const { data: org } = await authClient.organization.create({
      name: name.trim(),
      slug,
    })
    if (org) {
      await authClient.organization.setActive({ organizationId: org.id })
    }
    setName("")
    setCreating(false)
    setDialogOpen(false)
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-6 items-center justify-center rounded-full text-xs font-bold">
                  {activeOrg?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeOrg?.name ?? "Select workspace"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              align="start"
              sideOffset={4}
            >
              {orgs?.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() =>
                    authClient.organization.setActive({
                      organizationId: org.id,
                    })
                  }
                  className="gap-2"
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-bold">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{org.name}</span>
                </DropdownMenuItem>
              ))}
              {orgs && orgs.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="gap-2"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-4" />
                <span>New workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
