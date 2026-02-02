import { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DnsSettings, DnsSettingsUpdate, LoggingType } from '@/types/settings';

interface LoggingSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

export default function LoggingSettings({
  settings,
  isLoading,
  onSave,
}: LoggingSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Override states
  const [loggingTypeOverride, setLoggingTypeOverride] = useState<LoggingType | null>(null);
  const [logQueriesOverride, setLogQueriesOverride] = useState<boolean | null>(null);
  const [ignoreResolverLogsOverride, setIgnoreResolverLogsOverride] = useState<boolean | null>(null);
  const [useLocalTimeOverride, setUseLocalTimeOverride] = useState<boolean | null>(null);
  const [logFolderOverride, setLogFolderOverride] = useState<string | null>(null);
  const [maxLogFileDaysOverride, setMaxLogFileDaysOverride] = useState<string | null>(null);
  const [enableInMemoryStatsOverride, setEnableInMemoryStatsOverride] = useState<boolean | null>(null);
  const [maxStatFileDaysOverride, setMaxStatFileDaysOverride] = useState<string | null>(null);

  const formValues = useMemo(
    () => ({
      loggingType: loggingTypeOverride ?? settings?.loggingType ?? 'File',
      logQueries: logQueriesOverride ?? settings?.logQueries ?? false,
      ignoreResolverLogs: ignoreResolverLogsOverride ?? settings?.ignoreResolverLogs ?? false,
      useLocalTime: useLocalTimeOverride ?? settings?.useLocalTime ?? false,
      logFolder: logFolderOverride ?? settings?.logFolder ?? 'logs',
      maxLogFileDays: maxLogFileDaysOverride ?? String(settings?.maxLogFileDays ?? 30),
      enableInMemoryStats: enableInMemoryStatsOverride ?? settings?.enableInMemoryStats ?? false,
      maxStatFileDays: maxStatFileDaysOverride ?? String(settings?.maxStatFileDays ?? 365),
    }),
    [
      settings,
      loggingTypeOverride,
      logQueriesOverride,
      ignoreResolverLogsOverride,
      useLocalTimeOverride,
      logFolderOverride,
      maxLogFileDaysOverride,
      enableInMemoryStatsOverride,
      maxStatFileDaysOverride,
    ]
  );

  const hasChanges =
    loggingTypeOverride !== null ||
    logQueriesOverride !== null ||
    ignoreResolverLogsOverride !== null ||
    useLocalTimeOverride !== null ||
    logFolderOverride !== null ||
    maxLogFileDaysOverride !== null ||
    enableInMemoryStatsOverride !== null ||
    maxStatFileDaysOverride !== null;

  const clearOverrides = () => {
    setLoggingTypeOverride(null);
    setLogQueriesOverride(null);
    setIgnoreResolverLogsOverride(null);
    setUseLocalTimeOverride(null);
    setLogFolderOverride(null);
    setMaxLogFileDaysOverride(null);
    setEnableInMemoryStatsOverride(null);
    setMaxStatFileDaysOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const success = await onSave({
      loggingType: formValues.loggingType,
      logQueries: formValues.logQueries,
      ignoreResolverLogs: formValues.ignoreResolverLogs,
      useLocalTime: formValues.useLocalTime,
      logFolder: formValues.logFolder,
      maxLogFileDays: parseInt(formValues.maxLogFileDays, 10) || 30,
      enableInMemoryStats: formValues.enableInMemoryStats,
      maxStatFileDays: parseInt(formValues.maxStatFileDays, 10) || 365,
    });

    if (success) {
      clearOverrides();
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logging Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logging Configuration
          </CardTitle>
          <CardDescription>
            Configure server logs and audit trail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loggingType">Logging Type</Label>
              <Select
                value={formValues.loggingType}
                onValueChange={(value) => setLoggingTypeOverride(value as LoggingType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">Disabled</SelectItem>
                  <SelectItem value="File">File Only</SelectItem>
                  <SelectItem value="Console">Console Only</SelectItem>
                  <SelectItem value="FileAndConsole">File and Console</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formValues.loggingType !== 'None' && formValues.loggingType !== 'Console' && (
              <div className="space-y-2">
                <Label htmlFor="logFolder">Log Folder</Label>
                <Input
                  id="logFolder"
                  value={formValues.logFolder}
                  onChange={(e) => setLogFolderOverride(e.target.value)}
                  placeholder="logs"
                />
              </div>
            )}
          </div>

          {formValues.loggingType !== 'None' && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="logQueries">Log DNS Queries</Label>
                  <p className="text-xs text-muted-foreground">
                    Log all DNS queries and responses (may impact performance)
                  </p>
                </div>
                <Switch
                  id="logQueries"
                  checked={formValues.logQueries}
                  onCheckedChange={(checked) => setLogQueriesOverride(checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ignoreResolverLogs">Ignore Resolver Logs</Label>
                  <p className="text-xs text-muted-foreground">
                    Don't log recursive resolver errors
                  </p>
                </div>
                <Switch
                  id="ignoreResolverLogs"
                  checked={formValues.ignoreResolverLogs}
                  onCheckedChange={(checked) => setIgnoreResolverLogsOverride(checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useLocalTime">Use Local Time</Label>
                  <p className="text-xs text-muted-foreground">
                    Use local time instead of UTC for log timestamps
                  </p>
                </div>
                <Switch
                  id="useLocalTime"
                  checked={formValues.useLocalTime}
                  onCheckedChange={(checked) => setUseLocalTimeOverride(checked)}
                />
              </div>

              {formValues.loggingType !== 'Console' && (
                <div className="space-y-2">
                  <Label htmlFor="maxLogFileDays">Log Retention (days)</Label>
                  <Input
                    id="maxLogFileDays"
                    type="number"
                    min={0}
                    className="w-32"
                    value={formValues.maxLogFileDays}
                    onChange={(e) => setMaxLogFileDaysOverride(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-delete logs older than this (0 to disable)
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Statistics Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Statistics</CardTitle>
          <CardDescription>
            Configure statistics storage for the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableInMemoryStats">In-Memory Stats Only</Label>
              <p className="text-xs text-muted-foreground">
                Only keep last hour stats (no disk storage)
              </p>
            </div>
            <Switch
              id="enableInMemoryStats"
              checked={formValues.enableInMemoryStats}
              onCheckedChange={(checked) => setEnableInMemoryStatsOverride(checked)}
            />
          </div>

          {!formValues.enableInMemoryStats && (
            <div className="space-y-2">
              <Label htmlFor="maxStatFileDays">Stats Retention (days)</Label>
              <Input
                id="maxStatFileDays"
                type="number"
                min={0}
                className="w-32"
                value={formValues.maxStatFileDays}
                onChange={(e) => setMaxStatFileDaysOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-delete stats older than this (0 to disable)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Warning */}
      {formValues.logQueries && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>Performance Warning:</strong> Query logging is enabled. This may significantly
            impact performance on busy servers and consume large amounts of disk space. Consider
            disabling in production environments.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
