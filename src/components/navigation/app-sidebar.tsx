import * as React from "react"

import { NavMain, NavMainItem } from "@/components/navigation/nav-main"
import { NavProject, NavProjects } from "@/components/navigation/nav-projects"
import { NavUser } from "@/components/navigation/nav-user"
import { NavTeam, TeamSwitcher } from "@/components/navigation/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export type SidebarData = {
  user?: NavUser
  teams?: NavTeam[]
  navMain?: NavMainItem[]
  projects?: NavProject[]
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  data: SidebarData
  organizationName?: string
}

export function AppSidebar({ data, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      {(data.teams && data.teams[0]) && (
        <SidebarHeader>
          <TeamSwitcher teams={data.teams} />
        </SidebarHeader>
      )}
      <SidebarContent>
        {(data.navMain && data.navMain[0]) && (
          <NavMain items={data.navMain} />
        )}
        {(data.projects && data.projects[0]) && (
          <NavProjects projects={data.projects} />
        )}
      </SidebarContent>
      {data.user && (
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
