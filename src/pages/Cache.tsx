import { useState } from "react";
import {
  Database,
  Trash2,
  RefreshCw,
  Sparkles,
  HardDriveDownload,
  FolderOpen,
  Search,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import {
  flushCache,
  listCachedZones,
  deleteCachedZone,
  type DnsRecord,
} from "@/api/cache";
import { getStats } from "@/api/dns";
import { toast } from "sonner";

function formatRData(record: DnsRecord): string {
  const rData = record.rData;
  switch (record.type) {
    case "A":
    case "AAAA":
      return String(rData.ipAddress || rData.value || "");
    case "CNAME":
    case "NS":
    case "PTR":
      return String(
        rData.cname || rData.nameServer || rData.ptrName || rData.value || "",
      );
    case "MX":
      return `${rData.preference || 0} ${rData.exchange || rData.value || ""}`;
    case "TXT":
      return String(rData.text || rData.value || "");
    case "SOA":
      return `${rData.primaryNameServer || ""} ${rData.responsiblePerson || ""}`;
    default:
      if (typeof rData.value === "string") {
        return rData.value;
      }
      return JSON.stringify(rData);
  }
}

function parseTtl(ttl: string | number): { seconds: number; display: string } {
  if (typeof ttl === "number") {
    if (ttl === 0) return { seconds: 0, display: "expired" };
    if (ttl < 60) return { seconds: ttl, display: `${ttl}s` };
    if (ttl < 3600)
      return { seconds: ttl, display: `${Math.floor(ttl / 60)}m ${ttl % 60}s` };
    return {
      seconds: ttl,
      display: `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`,
    };
  }

  // Handle formats like "283 (4 mins 43 sec)" or just "283"
  const match = String(ttl).match(/^(\d+)/);
  if (match) {
    const seconds = parseInt(match[1]);
    const displayMatch = String(ttl).match(/\((.*?)\)/);
    if (displayMatch) {
      return { seconds, display: displayMatch[1] };
    }
    if (seconds === 0) return { seconds: 0, display: "expired" };
    if (seconds < 60) return { seconds, display: `${seconds}s` };
    if (seconds < 3600)
      return {
        seconds,
        display: `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
      };
    return {
      seconds,
      display: `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`,
    };
  }

  return { seconds: 0, display: String(ttl) };
}

// Cache Browser Component
function CacheBrowser({ onClose }: { onClose: () => void }) {
  const [currentDomain, setCurrentDomain] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [domainToDelete, setDomainToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, error, refetch } = useApi(
    () => listCachedZones(currentDomain || undefined),
    [currentDomain],
  );

  const records = data?.records ?? [];
  const zones = data?.zones ?? [];

  const filteredZones = zones.filter((zone) => {
    if (!filter) return true;
    const searchTerm = filter.toLowerCase();
    const zoneLower = zone.toLowerCase();

    // Simple substring match anywhere in the domain
    return zoneLower.includes(searchTerm);
  });

  const filteredRecords = records.filter((record) => {
    if (!filter) return true;
    const searchTerm = filter.toLowerCase();

    // Search in record name, type, or data
    return (
      record.name.toLowerCase().includes(searchTerm) ||
      record.type.toLowerCase().includes(searchTerm) ||
      formatRData(record).toLowerCase().includes(searchTerm)
    );
  });

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;
    setIsDeleting(true);

    const response = await deleteCachedZone(domainToDelete);

    if (response.status === "ok") {
      toast.success(`Cached records for "${domainToDelete}" deleted`);
      if (domainToDelete === currentDomain) {
        setCurrentDomain("");
      }
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to delete cached records");
    }

    setIsDeleting(false);
    setDomainToDelete(null);
  };

  return (
    <>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Cache Browser
          </DialogTitle>
          <DialogDescription>
            Browse and manage cached DNS records by domain
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-4 py-4">
            {/* Breadcrumb */}
            {currentDomain && (
              <div className="flex items-center gap-2 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentDomain("")}
                  className="h-8"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back to root
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-medium">{currentDomain}</span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDomainToDelete(currentDomain)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}

            {/* Search / Browse Domain */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    currentDomain
                      ? "Filter records..."
                      : "Enter domain name or search..."
                  }
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !currentDomain && filter) {
                      // Always navigate to the domain when Enter is pressed
                      setCurrentDomain(filter);
                      setFilter("");
                    }
                  }}
                  className="pl-9"
                />
                {filter && !currentDomain && (
                  <Button
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7"
                    onClick={() => {
                      setCurrentDomain(filter);
                      setFilter("");
                    }}
                  >
                    Browse
                  </Button>
                )}
              </div>
              {filter && !currentDomain && filteredZones.length > 0 && (
                <div className="text-xs text-muted-foreground px-1">
                  {filteredZones.length} cached domain
                  {filteredZones.length !== 1 ? "s" : ""} match your search
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Domain List (when at root) */}
            {!currentDomain && (
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="divide-y">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 px-4 py-3"
                        >
                          <Skeleton className="h-4 w-64" />
                          <div className="flex-1" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      ))}
                    </div>
                  ) : filteredZones.length === 0 && records.length === 0 ? (
                    <div className="py-12 text-center space-y-4">
                      <div>
                        <div className="text-muted-foreground mb-2">
                          {filter
                            ? `No cached domains match "${filter}"`
                            : "No cached domains found"}
                        </div>
                        {filter && zones.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {zones.length} domain{zones.length !== 1 ? "s" : ""}{" "}
                            available - try a shorter search
                          </div>
                        )}
                      </div>
                      {filter && filter.includes(".") && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Looking for a specific domain?
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentDomain(filter);
                              setFilter("");
                            }}
                          >
                            Browse {filter}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {/* Root records section */}
                      {!filter && records.length > 0 && (
                        <div className="px-4 py-3 bg-muted/50 font-medium text-sm flex items-center justify-between">
                          <span>Root Servers</span>
                          <Badge variant="secondary">{records.length}</Badge>
                        </div>
                      )}

                      {/* Cached domains */}
                      {filteredZones.map((zone) => (
                        <div
                          key={zone}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => {
                            setCurrentDomain(zone);
                            setFilter("");
                          }}
                        >
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm flex-1">
                            {zone}
                          </span>
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            cached
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDomainToDelete(zone);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Records List (when viewing a domain) */}
            {currentDomain && (
              <>
                {/* Subdomains */}
                {zones.length > 0 && !filter && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Subdomains</h3>
                      <div className="flex flex-wrap gap-2">
                        {zones.map((zone) => (
                          <Badge
                            key={zone}
                            variant="outline"
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => setCurrentDomain(zone)}
                          >
                            {zone}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* DNS Records */}
                <Card>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="divide-y">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-4 px-4 py-3"
                          >
                            <Skeleton className="h-5 w-12" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : filteredRecords.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        {filter
                          ? "No records match your filter"
                          : "No cached records found"}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredRecords.map((record, idx) => {
                          const ttlInfo = parseTtl(record.ttl);
                          const rdata = formatRData(record);
                          return (
                            <div
                              key={`${record.name}-${record.type}-${idx}`}
                              className="px-4 py-3.5 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <Badge
                                  variant="outline"
                                  className="mt-0.5 w-14 justify-center font-mono text-xs shrink-0 h-6"
                                >
                                  {record.type}
                                </Badge>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="font-mono text-sm font-medium break-all">
                                    {record.name}
                                  </div>
                                  <div className="font-mono text-sm text-muted-foreground break-all">
                                    {rdata}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[80px]">
                                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                                    TTL
                                  </div>
                                  <div
                                    className={`text-sm font-medium tabular-nums ${ttlInfo.seconds === 0 ? "text-destructive" : ""}`}
                                  >
                                    {ttlInfo.display}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Delete Domain Confirmation */}
      <AlertDialog
        open={!!domainToDelete}
        onOpenChange={() => !isDeleting && setDomainToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cached Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all cached records for "
              {domainToDelete || "<ROOT>"}"? This will force the DNS server to
              perform new recursive queries for this domain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDomain}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Main Cache Management Page
export default function Cache() {
  const [isFlushOpen, setIsFlushOpen] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const {
    data: statsData,
    isLoading,
    refetch,
  } = useApi(() => getStats("LastHour"), []);

  const cachedEntries = statsData?.cachedEntries ?? 0;
  const totalCached = statsData?.totalCached ?? 0;

  const handleFlush = async () => {
    setIsFlushing(true);
    const response = await flushCache();

    if (response.status === "ok") {
      toast.success("DNS cache cleared successfully", {
        description:
          "All cached records have been removed. New queries will be resolved fresh.",
      });
      setIsFlushOpen(false);
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to flush cache");
    }
    setIsFlushing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DNS Cache</h1>
        <p className="text-muted-foreground mt-1">
          Manage cached DNS records for faster query responses
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Stats (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cache Stats Card */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Database className="h-6 w-6 text-primary" />
                    Cache Status
                  </CardTitle>
                  <CardDescription>
                    Real-time cache statistics and management
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <HardDriveDownload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Cached Entries
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <div className="text-4xl font-bold text-blue-900 dark:text-blue-50">
                      {cachedEntries.toLocaleString()}
                    </div>
                  )}
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Total DNS records in cache
                  </p>
                </div>

                <div className="p-6 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border-2 border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Cache Hits (Last Hour)
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <div className="text-4xl font-bold text-amber-900 dark:text-amber-50">
                      {totalCached.toLocaleString()}
                    </div>
                  )}
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Queries served from cache
                  </p>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  How DNS Caching Works
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When your DNS server resolves a domain name, it stores the
                  result in cache for faster future lookups. This improves
                  response times and reduces load on upstream servers. Cached
                  records automatically expire based on their TTL (Time To Live)
                  values.
                </p>
              </div>

              {/* Actions Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="flex flex-col">
                  <h3 className="font-semibold">Browse Cache</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    View and manage individual cached domains and records
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setIsBrowserOpen(true)}
                    className="w-full mt-auto"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Open Cache Browser
                  </Button>
                </div>

                <div className="flex flex-col">
                  <h3 className="font-semibold">Clear Cache</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Remove all cached records and force fresh lookups
                  </p>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => setIsFlushOpen(true)}
                    className="w-full mt-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Flush DNS Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Guidance (1/3 width) */}
        <div className="space-y-6">
          {/* When to Clear Cache Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                When should I clear the cache?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    DNS records have changed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If you've updated DNS records and need them to take effect
                    immediately
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    Troubleshooting DNS issues
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clear stale or incorrect cached entries that may be causing
                    problems
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    After configuration changes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ensure your DNS server uses fresh data after making
                    configuration updates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Impact Notice */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Note:</strong> After clearing the cache, query response
              times will temporarily increase as the server rebuilds its cache
              through new upstream queries.
            </p>
          </div>
        </div>
      </div>

      {/* Cache Browser Dialog */}
      <Dialog open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
        <CacheBrowser onClose={() => setIsBrowserOpen(false)} />
      </Dialog>

      {/* Flush Cache Confirmation */}
      <AlertDialog
        open={isFlushOpen}
        onOpenChange={() => !isFlushing && setIsFlushOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear DNS Cache?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will remove all {cachedEntries.toLocaleString()} cached DNS
                records from the server.
              </p>
              <p>After clearing the cache:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All DNS queries will require fresh lookups</li>
                <li>Response times will temporarily increase</li>
                <li>The cache will automatically rebuild over time</li>
              </ul>
              <p className="font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFlushing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFlush}
              disabled={isFlushing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isFlushing ? "Clearing Cache..." : "Clear Cache"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
