import { DashboardSidebar } from "@/components/dashboard/sidebar/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteGuard } from "@/components/dashboard/rbac/route-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <DashboardSidebar />
        <SidebarInset className="h-screen overflow-hidden">
          <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:hidden z-50">
            <SidebarTrigger />
            <div className="font-semibold text-lg tracking-tight">Cilupbah</div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <RouteGuard>{children}</RouteGuard>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
