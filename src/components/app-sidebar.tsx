import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Globe,
  Settings,
  Server,
  Database,
  ShieldCheck,
  ShieldX,
  ScrollText,
  Blocks,
  Network,
  Users,
  ToolCase,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { getServerInfo } from "@/api/dns";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Zones", url: "/zones", icon: Globe },
  { title: "Cache", url: "/cache", icon: Database },
  { title: "Allowed", url: "/blocked?tab=allowed", icon: ShieldCheck },
  { title: "Blocked", url: "/blocked", icon: ShieldX },
  { title: "Apps", url: "/apps", icon: Blocks },
  { title: "DNS Client", url: "/dns-client", icon: ToolCase },
  { title: "Logs", url: "/logs", icon: ScrollText },
];

const systemNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "DHCP", url: "/dhcp", icon: Server },
  { title: "Administration", url: "/administration", icon: Users },
  { title: "Cluster", url: "/cluster", icon: Network },
  { title: "About", url: "/about", icon: Info },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const location = useLocation();
  const fullPath = location.pathname + location.search;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            // Handle URLs with query params (e.g., /blocked?tab=allowed)
            const itemHasQuery = item.url.includes('?');
            const isActive = itemHasQuery
              ? fullPath === item.url || fullPath.startsWith(item.url + '&')
              : location.pathname === item.url && !location.search.includes('tab=');
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const { data: serverInfo } = useApi(() => getServerInfo(), []);

  const userData = {
    name: user?.displayName || user?.username || "User",
    email: user?.username || "",
    avatar: "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2">
              <SidebarMenuButton size="lg" asChild className="flex-1" tooltip={serverInfo?.version ? `Isotope — Technitium DNS v${serverInfo.version}` : "Isotope"}>
                <Link to="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <svg
                      viewBox="0 0 512 512"
                      className="size-4"
                      fill="currentColor"
                    >
                      <circle
                        cx="256"
                        cy="256"
                        r="200"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="48"
                        opacity="0.3"
                      />
                      <circle cx="256" cy="256" r="96" />
                      <circle cx="456" cy="256" r="56" />
                    </svg>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Isotope</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {serverInfo?.version
                        ? `Technitium v${serverInfo.version}`
                        : "for Technitium DNS"}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
              <SidebarTrigger className="group-data-[collapsible=icon]:hidden" />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Overview" items={mainNavItems} />
        <NavGroup label="System" items={systemNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onLogout={logout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
