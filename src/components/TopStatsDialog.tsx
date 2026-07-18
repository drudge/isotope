import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { IsotopeSpinner } from "@/components/ui/isotope-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getTopStats, type StatsType, type TopStatsType } from "@/api/dns";
import type { TopClientEntry } from "@/types/api";

const TITLES: Record<TopStatsType, string> = {
  TopClients: "Top Clients",
  TopDomains: "Top Domains",
  TopBlockedDomains: "Top Blocked Domains",
};

const LIMITS = [25, 100, 250, 1000];

interface TopStatsDialogProps {
  open: boolean;
  onClose: () => void;
  statsType: TopStatsType;
  // The dashboard's currently selected duration, reused verbatim.
  timeRange: StatsType;
  customRange: { start: string; end: string } | null;
}

export default function TopStatsDialog({
  open,
  onClose,
  statsType,
  timeRange,
  customRange,
}: TopStatsDialogProps) {
  // Mount the content fresh on each open so state seeds from props directly.
  return (
    <Dialog open={open} onOpenChange={onClose}>
      {open && (
        <TopStatsDialogContent
          statsType={statsType}
          timeRange={timeRange}
          customRange={customRange}
        />
      )}
    </Dialog>
  );
}

function TopStatsDialogContent({
  statsType,
  timeRange,
  customRange,
}: Omit<TopStatsDialogProps, "open" | "onClose">) {
  const navigate = useNavigate();
  // TopDomainEntry is a subset of TopClientEntry (domain/rateLimited are
  // optional), so one entry shape covers all three stats types.
  const [entries, setEntries] = useState<TopClientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [onlyRateLimited, setOnlyRateLimited] = useState(false);
  const [search, setSearch] = useState("");

  const isClients = statsType === "TopClients";

  const fetchTop = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTopStats(statsType, timeRange, {
        ...(timeRange === "Custom" && customRange ? customRange : {}),
        limit,
        onlyRateLimitedClients: isClients && onlyRateLimited,
      });
      if (response.status === "ok" && response.response) {
        setEntries(
          response.response.topClients ??
            response.response.topDomains ??
            response.response.topBlockedDomains ??
            [],
        );
      } else {
        setEntries([]);
        toast.error(response.errorMessage || "Failed to load top stats");
      }
    } catch (err) {
      setEntries([]);
      toast.error(
        err instanceof Error ? err.message : "Failed to load top stats",
      );
    } finally {
      setLoading(false);
    }
  }, [statsType, timeRange, customRange, limit, onlyRateLimited, isClients]);

  useEffect(() => {
    void fetchTop();
  }, [fetchTop]);

  const filtered = search
    ? entries.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.domain?.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const totalHits = filtered.reduce((sum, e) => sum + e.hits, 0);

  const handleRowClick = (name: string) => {
    navigate(
      `/logs?tab=queries&${isClients ? "clientIp" : "qname"}=${encodeURIComponent(name)}`,
    );
  };

  return (
    <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader className="px-6 pt-6 pb-4 border-b">
        <DialogTitle>{TITLES[statsType]}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isClients ? "Filter clients..." : "Filter domains..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        <Select
          value={String(limit)}
          onValueChange={(v) => setLimit(Number(v))}
        >
          <SelectTrigger className="w-[110px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMITS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                Top {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isClients && (
          <div className="flex items-center gap-2">
            <Switch
              id="only-rate-limited"
              checked={onlyRateLimited}
              onCheckedChange={setOnlyRateLimited}
            />
            <Label
              htmlFor="only-rate-limited"
              className="text-sm font-normal cursor-pointer whitespace-nowrap"
            >
              Rate limited only
            </Label>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <IsotopeSpinner size="md" className="text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            {search
              ? "No entries match your filter"
              : onlyRateLimited
                ? "No rate limited clients"
                : "No data for this period"}
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((entry, idx) => (
              <div
                key={entry.name}
                className="flex items-center gap-3 px-6 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleRowClick(entry.name)}
              >
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm truncate" title={entry.name}>
                    {entry.name}
                  </div>
                  {entry.domain && (
                    <div className="text-xs text-muted-foreground truncate">
                      {entry.domain}
                    </div>
                  )}
                </div>
                {entry.rateLimited && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    Rate limited
                  </Badge>
                )}
                <span className="text-sm font-medium tabular-nums text-muted-foreground whitespace-nowrap shrink-0">
                  {entry.hits.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="px-6 py-2.5 border-t text-xs text-muted-foreground flex justify-between">
          <span>
            {filtered.length.toLocaleString()}
            {search ? ` of ${entries.length.toLocaleString()}` : ""}{" "}
            {isClients ? "clients" : "domains"}
          </span>
          <span className="tabular-nums">
            {totalHits.toLocaleString()} hits
          </span>
        </div>
      )}
    </DialogContent>
  );
}
