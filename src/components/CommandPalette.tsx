import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowUpCircle,
  Blocks,
  Clock,
  Database,
  Globe,
  Info,
  LayoutDashboard,
  Network,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  ShieldX,
  ToolCase,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { listZones } from "@/api/dns";
import { flushCache } from "@/api/cache";
import { temporaryDisableBlocking } from "@/api/blocking";
import type { Zone } from "@/types/api";

interface PageItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

// Mirrors the sidebar destinations (see app-sidebar.tsx), plus Profile.
const pageItems: PageItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Zones", url: "/zones", icon: Globe },
  { title: "Cache", url: "/cache", icon: Database },
  { title: "Allowed", url: "/blocked?tab=allowed", icon: ShieldCheck },
  { title: "Blocked", url: "/blocked", icon: ShieldX },
  { title: "Apps", url: "/apps", icon: Blocks },
  { title: "DNS Client", url: "/dns-client", icon: ToolCase },
  { title: "Logs", url: "/logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "DHCP", url: "/dhcp", icon: Server },
  { title: "Administration", url: "/administration", icon: Users },
  { title: "Cluster", url: "/cluster", icon: Network },
  { title: "About", url: "/about", icon: Info },
  { title: "Profile", url: "/profile", icon: User },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [zones, setZones] = useState<Zone[] | null>(null);
  const zonesRequested = useRef(false);
  const navigate = useNavigate();

  // Global Cmd/Ctrl+K shortcut. Only the modified key is handled here, so
  // plain typing in inputs/textareas/contenteditables never reaches the
  // palette, while the shortcut itself works even when a field has focus.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lazily fetch zones the first time the palette opens. On failure the
  // group is simply omitted and the next open retries.
  useEffect(() => {
    if (!open || zonesRequested.current) return;
    zonesRequested.current = true;
    listZones()
      .then((response) => {
        if (response.status === "ok" && response.response?.zones) {
          setZones(response.response.zones);
        } else {
          zonesRequested.current = false;
        }
      })
      .catch(() => {
        zonesRequested.current = false;
      });
  }, [open]);

  // Close the palette first, then perform the selected action.
  const runCommand = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  const handleFlushCache = useCallback(async () => {
    try {
      const response = await flushCache();
      if (response.status === "ok") {
        toast.success("DNS cache flushed");
      } else {
        toast.error(response.errorMessage || "Failed to flush DNS cache");
      }
    } catch {
      toast.error("Failed to flush DNS cache");
    }
  }, []);

  const handlePauseBlocking = useCallback(async () => {
    try {
      const response = await temporaryDisableBlocking(5);
      if (response.status === "ok") {
        const till = response.response?.temporaryDisableBlockingTill;
        toast.success(
          till
            ? `Blocking paused until ${new Date(till).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}`
            : "Blocking paused for 5 minutes"
        );
      } else {
        toast.error(response.errorMessage || "Failed to pause blocking");
      }
    } catch {
      toast.error("Failed to pause blocking");
    }
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pageItems.map((item) => (
            <CommandItem
              key={item.url}
              value={item.title}
              onSelect={() => runCommand(() => navigate(item.url))}
            >
              <item.icon />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {zones && zones.length > 0 && (
          <CommandGroup heading="Zones">
            {zones.map((zone) => (
              <CommandItem
                key={zone.name}
                value={`zone ${zone.name}`}
                keywords={[zone.type]}
                onSelect={() =>
                  runCommand(() =>
                    navigate(`/zones/${encodeURIComponent(zone.name)}`)
                  )
                }
              >
                <Globe />
                <span className="truncate">{zone.name}</span>
                <CommandShortcut className="tracking-normal">
                  {zone.type}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Actions">
          <CommandItem
            value="Flush DNS Cache"
            onSelect={() => runCommand(() => void handleFlushCache())}
          >
            <Trash2 />
            <span>Flush DNS Cache</span>
          </CommandItem>
          <CommandItem
            value="Pause Blocking (5 min)"
            onSelect={() => runCommand(() => void handlePauseBlocking())}
          >
            <Clock />
            <span>Pause Blocking (5 min)</span>
          </CommandItem>
          <CommandItem
            value="Check for Updates"
            onSelect={() => runCommand(() => navigate("/about"))}
          >
            <ArrowUpCircle />
            <span>Check for Updates</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
