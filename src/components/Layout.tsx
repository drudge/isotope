import { Outlet } from "react-router";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

function MobileHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="relative flex items-center justify-center px-4 py-3 border-b md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="absolute left-4 h-8 w-8"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-semibold">Isotope</span>
    </header>
  );
}

function LayoutContent() {
  return (
    <SidebarInset className="overflow-hidden">
      <MobileHeader />
      <main className="flex-1 overflow-auto p-4 lg:p-6 min-h-0">
        <Outlet />
      </main>
    </SidebarInset>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <LayoutContent />
    </SidebarProvider>
  );
}
