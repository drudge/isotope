import { useEffect, useState } from "react";
import {
  Download,
  Trash2,
  Loader2,
  FileText,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  listLogs,
  downloadLog,
  deleteLog,
  deleteAllLogs,
  type LogFile,
} from "@/api/serverLogs";
import { toast } from "sonner";

export default function ServerLogs() {
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [viewingLog, setViewingLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStacks, setExpandedStacks] = useState<Set<number>>(new Set());

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await listLogs();
      if (response.status === "ok" && response.response) {
        const logFiles = response.response.logFiles || [];
        setLogs(logFiles);

        // Auto-select the first (most recent) log file on desktop
        if (logFiles.length > 0 && !viewingLog && window.innerWidth >= 1024) {
          handleView(logFiles[0].fileName);
        }
      } else {
        toast.error("Failed to load server logs");
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      toast.error("Failed to load server logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleView = async (fileName: string) => {
    setViewingLog(fileName);
    setLoadingContent(true);
    setSearchTerm("");
    try {
      const blob = await downloadLog(fileName);
      const text = await blob.text();
      setLogContent(text);
    } catch (error) {
      console.error("Failed to load log:", error);
      toast.error("Failed to load log file");
      setViewingLog(null);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const blob = await downloadLog(fileName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Log file downloaded");
    } catch (error) {
      console.error("Failed to download log:", error);
      toast.error("Failed to download log file");
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const response = await deleteLog(fileName);
      if (response.status === "ok") {
        toast.success("Log file deleted");
        if (viewingLog === fileName) {
          setViewingLog(null);
          setLogContent("");
        }
        fetchLogs();
      } else {
        toast.error("Failed to delete log file");
      }
    } catch (error) {
      console.error("Failed to delete log:", error);
      toast.error("Failed to delete log file");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const response = await deleteAllLogs();
      if (response.status === "ok") {
        toast.success("All log files deleted");
        setViewingLog(null);
        setLogContent("");
        fetchLogs();
      } else {
        toast.error("Failed to delete log files");
      }
    } catch (error) {
      console.error("Failed to delete all logs:", error);
      toast.error("Failed to delete log files");
    } finally {
      setDeleteAllConfirm(false);
    }
  };

  const handleBack = () => {
    setViewingLog(null);
    setLogContent("");
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleStack = (index: number) => {
    setExpandedStacks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const filteredLogLines = logContent.split("\n").filter((line) => {
    if (!searchTerm) return true;
    return line.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Group log lines, combining errors with their stack traces
  type LogEntry = {
    line: string;
    timestamp?: string;
    ipPort?: string;
    user?: string;
    message?: string;
    isError: boolean;
    stackTrace?: string[];
  };

  const parseLogEntries = (lines: string[]): LogEntry[] => {
    const entries: LogEntry[] = [];
    let currentEntry: LogEntry | null = null;

    for (const line of lines) {
      // Match pattern: [2026-01-26 01:36:57 Local] [IP:port] [user] message
      const mainMatch = line.match(
        /^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+\w+)\]\s*(?:\[([^\]]+)\])?\s*(?:\[([^\]]+)\])?\s*(.*)$/,
      );

      if (mainMatch) {
        // Save previous entry
        if (currentEntry) {
          entries.push(currentEntry);
        }

        const [, timestamp, ipPort, user, message] = mainMatch;
        const isError =
          message?.toLowerCase().includes("exception") ||
          message?.toLowerCase().includes("error") ||
          message?.toLowerCase().includes("cannot");

        currentEntry = {
          line,
          timestamp,
          ipPort,
          user,
          message,
          isError,
          stackTrace: [],
        };
      } else if (line.match(/^\s+at\s/) && currentEntry) {
        // Stack trace line - add to current entry
        currentEntry.stackTrace?.push(line);
      } else {
        // Other line
        if (currentEntry) {
          entries.push(currentEntry);
          currentEntry = null;
        }
        entries.push({ line, isError: false });
      }
    }

    // Don't forget the last entry
    if (currentEntry) {
      entries.push(currentEntry);
    }

    return entries;
  };

  const renderLogEntry = (entry: LogEntry, index: number) => {
    if (entry.timestamp) {
      const hasStack = entry.stackTrace && entry.stackTrace.length > 0;
      const isExpanded = expandedStacks.has(index);

      return (
        <div key={index}>
          <div
            className={`flex gap-2 py-0.5 px-3 -mx-3 ${hasStack ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30"}`}
            onClick={hasStack ? () => toggleStack(index) : undefined}
          >
            <div className="w-3.5 shrink-0 flex items-start justify-center">
              {hasStack && (
                <ChevronRight
                  className={`h-3.5 w-3.5 mt-0.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              )}
            </div>
            <span className="text-muted-foreground shrink-0">
              {entry.timestamp}
            </span>
            {entry.ipPort && (
              <span className="text-cyan-500 dark:text-cyan-400 shrink-0">
                {entry.ipPort}
              </span>
            )}
            {entry.user && (
              <span className="text-violet-500 dark:text-violet-400 shrink-0">
                [{entry.user}]
              </span>
            )}
            <span
              className={
                entry.isError
                  ? "text-red-500 dark:text-red-400"
                  : "text-foreground"
              }
            >
              {entry.message}
            </span>
            {hasStack && !isExpanded && (
              <span className="text-muted-foreground text-[10px] ml-1">
                ({entry.stackTrace?.length} frames)
              </span>
            )}
          </div>
          {hasStack && isExpanded && (
            <div className="ml-5 pl-3 border-l border-muted-foreground/20 my-1">
              {entry.stackTrace?.map((traceLine, i) => (
                <div
                  key={i}
                  className="text-muted-foreground/70 py-0.5 text-[11px]"
                >
                  {traceLine.trim()}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default - just render the line
    return (
      <div
        key={index}
        className="flex gap-2 py-0.5 hover:bg-muted/30 px-3 -mx-3"
      >
        <div className="w-3.5 shrink-0" />
        <span>{entry.line || "\u00A0"}</span>
      </div>
    );
  };

  // On mobile, show either the list or the viewer (not both)
  const showViewer = viewingLog !== null;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 h-full min-h-0">
      {/* Log Files List - Hidden on mobile when viewing a log */}
      <Card
        className={`lg:col-span-1 flex flex-col min-h-0 ${showViewer ? "hidden lg:flex" : "flex"}`}
      >
        <CardContent className="p-0 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between gap-2 p-3 border-b shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold text-sm">Log Files</span>
              {logs.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({logs.length})
                </span>
              )}
            </div>
            {logs.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteAllConfirm(true)}
                className="text-destructive hover:text-destructive h-8 px-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Delete All</span>
              </Button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground flex-1">
              <FileText className="h-10 w-10 opacity-20 mb-3" />
              <p className="font-medium text-sm">No log files</p>
              <p className="text-xs">Logs will appear here</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto divide-y">
              {logs.map((log) => (
                <div
                  key={log.fileName}
                  className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    viewingLog === log.fileName
                      ? "bg-muted"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleView(log.fileName)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm truncate">
                      {log.fileName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.size}
                    </div>
                  </div>
                  <div
                    className="flex items-center shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(log.fileName)}
                      className="h-7 w-7"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirm(log.fileName)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Viewer - Full width on mobile when viewing */}
      <Card
        className={`lg:col-span-2 flex flex-col min-h-0 ${showViewer ? "flex" : "hidden lg:flex"}`}
      >
        <CardContent className="p-0 flex flex-col flex-1 min-h-0 overflow-hidden">
          {viewingLog ? (
            <>
              {/* Viewer Header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 lg:hidden shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                <span className="font-mono text-sm font-medium truncate flex-1">
                  {viewingLog}.log
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(viewingLog)}
                  className="h-8 shrink-0"
                >
                  <Download className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </div>

              {/* Search Bar */}
              <div className="px-3 py-2 border-b shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search in log..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Log Content */}
              <div className="flex-1 overflow-auto min-h-0 bg-muted/30">
                {loadingContent ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="p-3 text-xs font-mono leading-relaxed">
                    {parseLogEntries(
                      searchTerm ? filteredLogLines : logContent.split("\n"),
                    ).map((entry, index) => renderLogEntry(entry, index))}
                  </div>
                )}
              </div>

              {/* Footer with stats */}
              {searchTerm && (
                <div className="px-3 py-1.5 border-t bg-background shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {filteredLogLines.length} of {logContent.split("\n").length}{" "}
                    lines
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground py-12">
              <FileText className="h-10 w-10 opacity-20 mb-3" />
              <p className="font-medium text-sm">Select a log file</p>
              <p className="text-xs mt-1">
                Choose from the list to view contents
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Log File?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm}</strong>?
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all confirmation dialog */}
      <AlertDialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete All Log Files?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will permanently delete all {logs.length} log files. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
