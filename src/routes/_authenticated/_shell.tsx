import { createFileRoute, Outlet } from "@tanstack/react-router";
import { format } from "date-fns";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CompanyProvider, useCompany } from "@/hooks/use-company";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <CompanyProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="bg-background">
            <TopBar />
            <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 md:px-8 md:py-10">
              <Outlet />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </CompanyProvider>
  );
}

function TopBar() {
  const { company } = useCompany();
  return (
    <header className="print-hidden sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <SidebarTrigger className="text-muted-foreground" />
      <span className="h-5 w-px bg-border" />
      <p className="truncate text-sm font-semibold">{company?.name}</p>
      <p className="ml-auto hidden font-mono text-xs text-muted-foreground sm:block">
        {format(new Date(), "EEE, MMM d yyyy")}
      </p>
    </header>
  );
}
