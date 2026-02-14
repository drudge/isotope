import { useCallback, useEffect, useState, useRef } from "react";
import {
  X,
  Search,
  Copy,
  Download,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { IsotopeSpinner } from "@/components/ui/isotope-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryLogs, type QueryLogEntry } from "@/api/logs";
import { listApps, type DnsApp } from "@/api/apps";
import { cn } from "@/lib/utils";

interface QueryLogsModalProps {
  open: boolean;
  onClose: () => void;
  initialFilter?: {
    clientIpAddress?: string;
    qname?: string;
    responseType?: string;
    rcode?: string;
  };
}

export default function QueryLogsModal({
  open,
  onClose,
  initialFilter,
}: QueryLogsModalProps) {
  const [logs, setLogs] = useState<QueryLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Query logger state
  const [queryLoggers, setQueryLoggers] = useState<
    Array<{ appName: string; app: DnsApp }>
  >([]);
  const [selectedLogger, setSelectedLogger] = useState<string>("");
  const [loadingLoggers, setLoadingLoggers] = useState(true);

  // Filters - use initialFilter values directly in state initialization
  const [clientIpAddress, setClientIpAddress] = useState("");
  const [protocol, setProtocol] = useState<string>("");
  const [responseType, setResponseType] = useState<string>("");
  const [rcode, setRcode] = useState<string>("");
  const [qname, setQname] = useState("");
  const [qtype, setQtype] = useState<string>("");

  // Track whether the initial filter has been applied for this modal session
  const initialFilterApplied = useRef(false);
  // Flag to skip the next filter effect run (prevents race condition)
  const skipNextFilterEffect = useRef(false);

  // Define fetchLogsWithParams callback
  const fetchLogsWithParams = useCallback(
    async (params: {
      pageNumber: number;
      entriesPerPage: number;
      clientIpAddress?: string;
      qname?: string;
      protocol?: string;
      responseType?: string;
      rcode?: string;
      qtype?: string;
    }) => {
      if (!selectedLogger) {
        setError("No query logger selected");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Parse selected logger: "AppName::ClassPath"
        const [appName, classPath] = selectedLogger.split("::");

        const response = await queryLogs({
          name: appName,
          classPath: classPath,
          pageNumber: params.pageNumber,
          entriesPerPage: params.entriesPerPage,
          descendingOrder: true,
          clientIpAddress: params.clientIpAddress || undefined,
          protocol:
            params.protocol && params.protocol !== "all"
              ? params.protocol
              : undefined,
          responseType:
            params.responseType && params.responseType !== "all"
              ? params.responseType
              : undefined,
          rcode: params.rcode || undefined,
          qname: params.qname || undefined,
          qtype: params.qtype || undefined,
        });

        if (response.status === "ok" && response.response) {
          setLogs(response.response.entries || []);
          setTotalPages(response.response.totalPages || 0);
          setTotalEntries(response.response.totalEntries || 0);
        } else {
          throw new Error(response.errorMessage || "Failed to load logs");
        }
      } catch (err) {
        console.error("Failed to fetch query logs:", err);
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        if (errorMsg.includes("not found")) {
          setError(
            "The selected query logger app was not found or has been uninstalled. Please select a different query logger.",
          );
        } else if (errorMsg.includes("404")) {
          setError(
            "Query logging may not be enabled on this DNS server. Please check your server settings.",
          );
        } else {
          setError(`Failed to load query logs: ${errorMsg}`);
        }
        setLogs([]);
        setTotalPages(0);
        setTotalEntries(0);
      } finally {
        setLoading(false);
      }
    },
    [selectedLogger],
  );

  // Define fetchLogs callback
  const fetchLogs = useCallback(async () => {
    await fetchLogsWithParams({
      pageNumber,
      entriesPerPage,
      clientIpAddress,
      qname,
      protocol,
      responseType,
      rcode,
      qtype,
    });
  }, [
    fetchLogsWithParams,
    pageNumber,
    entriesPerPage,
    clientIpAddress,
    qname,
    protocol,
    responseType,
    rcode,
    qtype,
  ]);

  // Reset initialization tracking when modal closes
  useEffect(() => {
    if (!open) {
      initialFilterApplied.current = false;
      skipNextFilterEffect.current = false;
    }
  }, [open]);

  // Fetch available query loggers when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchQueryLoggers = async () => {
      setLoadingLoggers(true);
      try {
        const response = await listApps();
        if (response.status === "ok" && response.response) {
          const loggers: Array<{ appName: string; app: DnsApp }> = [];
          response.response.apps.forEach((installedApp) => {
            installedApp.dnsApps.forEach((dnsApp) => {
              if (dnsApp.isQueryLogger) {
                loggers.push({ appName: installedApp.name, app: dnsApp });
              }
            });
          });
          setQueryLoggers(loggers);
          // Auto-select first logger if available
          if (loggers.length > 0 && !selectedLogger) {
            setSelectedLogger(
              `${loggers[0].appName}::${loggers[0].app.classPath}`,
            );
          }
        }
      } catch (err) {
        console.error("Failed to fetch query loggers:", err);
      } finally {
        setLoadingLoggers(false);
      }
    };

    fetchQueryLoggers();
  }, [open, selectedLogger]);

  // Apply initial filters and fetch when modal opens or initialFilter changes
  useEffect(() => {
    if (!open || loadingLoggers || !selectedLogger) return;

    const newClientIp = initialFilter?.clientIpAddress || "";
    const newQname = initialFilter?.qname || "";
    const newResponseType = initialFilter?.responseType || "";
    const newRcode = initialFilter?.rcode || "";

    setClientIpAddress(newClientIp);
    setQname(newQname);
    setProtocol("");
    setResponseType(newResponseType);
    setRcode(newRcode);
    setQtype("");
    setShowFilters(false);
    setPageNumber(1);
    setSearchTerm("");

    // Mark initial filter as applied and skip the next filter effect run
    initialFilterApplied.current = true;
    skipNextFilterEffect.current = true;

    // Fetch with the new filter values directly
    fetchLogsWithParams({
      pageNumber: 1,
      entriesPerPage,
      clientIpAddress: newClientIp,
      qname: newQname,
      responseType: newResponseType,
      rcode: newRcode,
    });
  }, [
    open,
    loadingLoggers,
    selectedLogger,
    entriesPerPage,
    fetchLogsWithParams,
    initialFilter?.clientIpAddress,
    initialFilter?.qname,
    initialFilter?.responseType,
    initialFilter?.rcode,
  ]);

  // Fetch logs when filters or pagination changes (but not on initial open)
  useEffect(() => {
    if (!selectedLogger || loadingLoggers || !open) return;
    // Skip if initial filter hasn't been applied yet (prevents race condition)
    if (!initialFilterApplied.current) return;
    // Skip this run if initial filter effect just executed (both effects triggered by same state change)
    if (skipNextFilterEffect.current) {
      skipNextFilterEffect.current = false;
      return;
    }
    if (
      clientIpAddress === (initialFilter?.clientIpAddress || "") &&
      qname === (initialFilter?.qname || "") &&
      responseType === (initialFilter?.responseType || "") &&
      rcode === (initialFilter?.rcode || "")
    ) {
      // Skip if this is the initial load (already handled above)
      return;
    }
    fetchLogs();
  }, [
    fetchLogs,
    loadingLoggers,
    open,
    selectedLogger,
    clientIpAddress,
    qname,
    protocol,
    responseType,
    rcode,
    qtype,
    initialFilter?.clientIpAddress,
    initialFilter?.qname,
    initialFilter?.responseType,
    initialFilter?.rcode,
  ]);

  const handleSearch = () => {
    setPageNumber(1);
    fetchLogs();
  };

  const handleReset = () => {
    setClientIpAddress("");
    setProtocol("");
    setResponseType("");
    setRcode("");
    setQname("");
    setQtype("");
    setSearchTerm("");
    setPageNumber(1);
    // Trigger a fresh fetch after resetting
    setTimeout(() => fetchLogs(), 0);
  };

  const copyToClipboard = () => {
    const text = logs
      .map(
        (log) =>
          `${log.timestamp}\t${log.clientIpAddress}\t${log.qname}\t${log.qtype}\t${log.responseType}\t${log.rcode}\t${log.protocol.toUpperCase()}\t${log.answer}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.clientIpAddress.toLowerCase().includes(search) ||
      log.qname.toLowerCase().includes(search) ||
      log.answer.toLowerCase().includes(search) ||
      log.responseType.toLowerCase().includes(search) ||
      log.protocol.toLowerCase().includes(search) ||
      log.rcode.toLowerCase().includes(search) ||
      log.qtype.toLowerCase().includes(search)
    );
  });

  const hasActiveFilters =
    clientIpAddress || protocol || responseType || rcode || qname || qtype;

  const getResponseTypeBadge = (type: string) => {
    const badges = {
      Cached: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      Recursive: "bg-green-500/10 text-green-600 dark:text-green-400",
      Authoritative: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      Blocked: "bg-red-500/10 text-red-600 dark:text-red-400",
      UpstreamBlocked: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      CacheBlocked: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
    return (
      badges[type as keyof typeof badges] || "bg-muted text-muted-foreground"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-[90vw] w-full h-[95vh] p-0 gap-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <DialogTitle className="text-base sm:text-lg font-semibold">
                Query Logs
              </DialogTitle>

              {/* Query Logger Selector */}
              {queryLoggers.length > 0 && (
                <Select
                  value={selectedLogger}
                  onValueChange={setSelectedLogger}
                >
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Select logger..." />
                  </SelectTrigger>
                  <SelectContent>
                    {queryLoggers.map((logger) => (
                      <SelectItem
                        key={`${logger.appName}::${logger.app.classPath}`}
                        value={`${logger.appName}::${logger.app.classPath}`}
                      >
                        {logger.appName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {totalEntries > 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {totalEntries.toLocaleString()}{" "}
                  {totalEntries === 1 ? "entry" : "entries"}
                </span>
              )}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  {clientIpAddress && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      IP: {clientIpAddress}
                    </span>
                  )}
                  {qname && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Domain: {qname}
                    </span>
                  )}
                  {qtype && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Type: {qtype}
                    </span>
                  )}
                  {protocol && protocol !== "all" && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Protocol: {protocol.toUpperCase()}
                    </span>
                  )}
                  {responseType && responseType !== "all" && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Response: {responseType}
                    </span>
                  )}
                  {rcode && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      RCODE: {rcode}
                    </span>
                  )}
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8 gap-1.5"
              >
                <Filter
                  className={cn(
                    "h-3.5 w-3.5",
                    hasActiveFilters && "fill-current",
                  )}
                />
                <span className="hidden sm:inline">Filters</span>
                {showFilters ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden gap-0">
          {/* Filters */}
          {showFilters && (
            <div className="px-4 sm:px-6 py-3 border-b bg-muted/30 shrink-0">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Client IP
                    </label>
                    <Input
                      placeholder="e.g. 10.0.7.168"
                      value={clientIpAddress}
                      onChange={(e) => setClientIpAddress(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Domain
                    </label>
                    <Input
                      placeholder="e.g. example.com"
                      value={qname}
                      onChange={(e) => setQname(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Query Type
                    </label>
                    <Input
                      placeholder="e.g. A, AAAA"
                      value={qtype}
                      onChange={(e) => setQtype(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Response Type
                    </label>
                    <Select
                      value={responseType || "all"}
                      onValueChange={(v) =>
                        setResponseType(v === "all" ? "" : v)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Authoritative">
                          Authoritative
                        </SelectItem>
                        <SelectItem value="Recursive">Recursive</SelectItem>
                        <SelectItem value="Cached">Cached</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                        <SelectItem value="UpstreamBlocked">
                          Upstream Blocked
                        </SelectItem>
                        <SelectItem value="CacheBlocked">
                          Cache Blocked
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Protocol
                    </label>
                    <Select
                      value={protocol || "all"}
                      onValueChange={(v) => setProtocol(v === "all" ? "" : v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Protocols</SelectItem>
                        <SelectItem value="Udp">UDP</SelectItem>
                        <SelectItem value="Tcp">TCP</SelectItem>
                        <SelectItem value="Tls">TLS</SelectItem>
                        <SelectItem value="Https">HTTPS</SelectItem>
                        <SelectItem value="Quic">QUIC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      RCODE
                    </label>
                    <Input
                      placeholder="e.g. NoError"
                      value={rcode}
                      onChange={(e) => setRcode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSearch}
                    size="sm"
                    className="h-9 gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="px-4 sm:px-6 py-2 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in results..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
          </div>

          {/* Logs table */}
          <div className="flex-1 overflow-auto overflow-x-auto">
            {loadingLoggers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <IsotopeSpinner size="md" className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading query loggers...
                </p>
              </div>
            ) : queryLoggers.length === 0 ? (
              <div className="flex flex-col items-start p-6 gap-3 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Search className="h-5 w-5 opacity-50 mt-0.5" />
                  <div className="max-w-md">
                    <p className="font-medium text-foreground">
                      No Query Logger Apps Found
                    </p>
                    <p className="text-sm mt-1">
                      To view query logs, you need to install a query logger DNS
                      app from the Apps section. Popular options include "Query
                      Logger" or other logging apps available in the DNS App
                      Store.
                    </p>
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <IsotopeSpinner size="md" className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading query logs...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-start p-6 gap-3 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Search className="h-5 w-5 opacity-50 mt-0.5" />
                  <div className="max-w-md">
                    <p className="font-medium text-foreground">
                      Unable to Load Query Logs
                    </p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-start p-6 gap-3 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Search className="h-5 w-5 opacity-50 mt-0.5" />
                  <div>
                    <p className="font-medium">No logs found</p>
                    <p className="text-sm mt-1">
                      Try adjusting your filters or search terms
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <colgroup>
                  <col className="w-auto" />
                </colgroup>
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b z-10">
                  <tr className="text-xs">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Timestamp
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Client IP
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Domain
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Type
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Response
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Protocol
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground whitespace-nowrap">
                      Answer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log, index) => (
                    <tr
                      key={`${log.rowNumber}-${index}`}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">
                        {log.clientIpAddress}
                      </td>
                      <td
                        className="py-2 px-3 font-mono text-xs max-w-[200px] lg:max-w-xs truncate"
                        title={log.qname}
                      >
                        {log.qname}
                      </td>
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted">
                          {log.qtype}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
                            getResponseTypeBadge(log.responseType),
                          )}
                        >
                          {log.responseType}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            log.rcode === "NoError"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400",
                          )}
                        >
                          {log.rcode}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {log.protocol.toUpperCase()}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">
                        {log.answer ? (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {log.answer.split(",").map((ans, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted/50 text-xs"
                                title={ans.trim()}
                              >
                                {ans.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer with pagination */}
          <div className="px-4 sm:px-6 py-3 border-t bg-muted/30 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Rows per page:
                </span>
                <Select
                  value={entriesPerPage.toString()}
                  onValueChange={(v) => {
                    setEntriesPerPage(Number(v));
                    setPageNumber(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                  </SelectContent>
                </Select>
                {totalEntries > 0 && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {(pageNumber - 1) * entriesPerPage + 1}-
                    {Math.min(pageNumber * entriesPerPage, totalEntries)} of{" "}
                    {totalEntries}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber(1)}
                  disabled={pageNumber === 1 || loading}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="sr-only sm:not-sr-only">First</span>
                  <span className="sm:hidden">««</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber === 1 || loading}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="sr-only sm:not-sr-only">Prev</span>
                  <span className="sm:hidden">«</span>
                </Button>
                <div className="px-2 sm:px-3 text-xs sm:text-sm font-medium whitespace-nowrap">
                  {pageNumber} / {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPageNumber((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={pageNumber === totalPages || loading}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="sr-only sm:not-sr-only">Next</span>
                  <span className="sm:hidden">»</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber(totalPages)}
                  disabled={pageNumber === totalPages || loading}
                  className="h-8 px-2 sm:px-3"
                >
                  <span className="sr-only sm:not-sr-only">Last</span>
                  <span className="sm:hidden">»»</span>
                </Button>
                <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-8 gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Copy</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Export</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
