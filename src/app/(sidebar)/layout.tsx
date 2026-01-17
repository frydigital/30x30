import { AppPageHeader } from "@/components/navigation/app-page-header";
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
          <main className="px-6 py-2 grid">
            <AppPageHeader/>
            {children}
          </main>
        </SidebarInset>
      </NavDataProvider>
    </SidebarProvider>
  );
}
