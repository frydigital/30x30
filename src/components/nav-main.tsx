"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Crown, Building2, CreditCard, Users, BarChart3 } from "lucide-react";

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const navItems = [
    {
      href: "/superadmin",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      href: "/superadmin/organizations",
      label: "Organizations",
      icon: Building2,
    },
    {
      href: "/superadmin/subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
    },
    {
      href: "/superadmin/users",
      label: "Users",
      icon: Users,
    },
  ];
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuSubItem key={item.label}>
                        <SidebarMenuSubButton asChild>
                          <a href={item.href}>
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>

                    );
                  })}


                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <a href={subItem.url}>
                          <span>{subItem.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
