import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NavDataProvider } from "@/lib/navigation/context";
import { ReactNode } from "react";

export default function SuperadminLayout({
  children,
}: {
  children: ReactNode;
}) {


  return (
    <SidebarProvider>
      <NavDataProvider>
        <AppSidebar />
        <SidebarInset>
          <main>
            {children}
          </main>
        </SidebarInset>
      </NavDataProvider>
    </SidebarProvider>
  );
}
