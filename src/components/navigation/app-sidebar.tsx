
'use client'
import { NavMain } from "@/components/navigation/nav-main"
import { NavUser } from "@/components/navigation/nav-user"
import { TeamSwitcher } from "@/components/navigation/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"
import { useNavigation } from '@/lib/navigation'

export function AppSidebar() {
  const { navMain, user, teams } = useNavigation()
  
  return (   
      <Sidebar collapsible="icon">
        {(teams && teams[0]) && (
          <>
          <SidebarHeader>
            <TeamSwitcher teams={teams} />
          </SidebarHeader>
          </>
        )}
        <SidebarContent>
          {(navMain && navMain[0]) && (
            <NavMain items={navMain} />
          )}
        </SidebarContent>
        {user && (
          <SidebarFooter>
            <NavUser user={user} />
          </SidebarFooter>
        )}
        <SidebarRail />
      </Sidebar>
  )
}
