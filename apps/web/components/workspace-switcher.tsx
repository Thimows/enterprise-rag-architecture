"use client"

import { useEffect } from "react"
import { ChevronsUpDown, Plus } from "lucide-react"
import { authClient } from "@/lib/auth-client"
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

  // Auto-select the first org when none is active (e.g. after sign-in)
  useEffect(() => {
    if (!activeOrg && orgs && orgs.length > 0) {
      authClient.organization.setActive({ organizationId: orgs[0]!.id })
    }
  }, [activeOrg, orgs])

  return (
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
                onClick={() => authClient.organization.setActive({ organizationId: org.id })}
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
              onClick={async () => {
                const name = prompt("Organization name:")
                if (!name) return
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
                const { data: org } = await authClient.organization.create({ name, slug })
                if (org) {
                  await authClient.organization.setActive({ organizationId: org.id })
                }
              }}
            >
              <Plus className="size-4" />
              <span>New workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
