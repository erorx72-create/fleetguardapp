import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BellRing, ClipboardCheck, LayoutDashboard, LogOut, Truck, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand";
import { CompanySwitcher } from "@/components/company-switcher";
import { useFleet } from "@/hooks/use-fleet";
import { supabase } from "@/integrations/supabase/client";
import { isRed } from "@/lib/compliance";

const items = [
  { title: "Dashboard", sub: "Command Center", url: "/dashboard", icon: LayoutDashboard },
  { title: "Drivers", sub: "DQF", url: "/drivers", icon: Users },
  { title: "Trucks & Trailers", sub: "", url: "/trucks", icon: Truck },
  { title: "Urgent Alerts", sub: "", url: "/alerts", icon: BellRing },
  { title: "DOT Audit Report", sub: "", url: "/audit", icon: ClipboardCheck },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { data } = useFleet();
  const redCount = data.documents.filter((d) => isRed(d.status)).length;
  const urgentCount = data.documents.filter((d) => d.status !== "compliant").length;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0 print-hidden">
      <SidebarHeader className="gap-4 bg-gradient-navy px-3 pt-4">
        <div className="flex items-center gap-2.5 px-1">
          <BrandMark className="size-8" />
          {!collapsed && (
            <span className="font-display text-base font-bold tracking-tight text-sidebar-accent-foreground">
              FleetGuard
            </span>
          )}
        </div>
        <CompanySwitcher />
      </SidebarHeader>

      <SidebarContent className="bg-gradient-navy px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/50">
            Compliance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = path === item.url || path.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      size="lg"
                      className="h-11 rounded-lg font-semibold text-sidebar-foreground transition-all data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-glow"
                    >
                      <Link to={item.url}>
                        <item.icon className="!size-[18px]" />
                        <span>
                          {item.title}
                          {item.sub && (
                            <span className="ml-1.5 text-xs font-medium opacity-60">{item.sub}</span>
                          )}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                    {item.url === "/alerts" && urgentCount > 0 && (
                      <SidebarMenuBadge
                        className={
                          redCount > 0
                            ? "top-3 rounded-full bg-danger px-1.5 text-danger-soft"
                            : "top-3 rounded-full bg-warning px-1.5 text-warning-foreground"
                        }
                      >
                        {urgentCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip="Sign out"
              className="h-10 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
            >
              <LogOut />
              <span className="min-w-0 flex-1 truncate text-xs">{email ?? "Account"}</span>
              <span className="text-xs font-semibold">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
