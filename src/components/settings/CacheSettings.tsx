import { useState, useMemo } from 'react';
import { Save, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DnsSettings, DnsSettingsUpdate } from '@/types/settings';

interface CacheSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

export default function CacheSettings({
  settings,
  isLoading,
  onSave,
}: CacheSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Override states
  const [saveCacheOverride, setSaveCacheOverride] = useState<boolean | null>(null);
  const [serveStaleOverride, setServeStaleOverride] = useState<boolean | null>(null);
  const [serveStaleTtlOverride, setServeStaleTtlOverride] = useState<string | null>(null);
  const [serveStaleAnswerTtlOverride, setServeStaleAnswerTtlOverride] = useState<string | null>(null);
  const [serveStaleResetTtlOverride, setServeStaleResetTtlOverride] = useState<string | null>(null);
  const [serveStaleMaxWaitOverride, setServeStaleMaxWaitOverride] = useState<string | null>(null);
  const [maxEntriesOverride, setMaxEntriesOverride] = useState<string | null>(null);
  const [minTtlOverride, setMinTtlOverride] = useState<string | null>(null);
  const [maxTtlOverride, setMaxTtlOverride] = useState<string | null>(null);
  const [negativeTtlOverride, setNegativeTtlOverride] = useState<string | null>(null);
  const [failureTtlOverride, setFailureTtlOverride] = useState<string | null>(null);
  const [prefetchEligibilityOverride, setPrefetchEligibilityOverride] = useState<string | null>(null);
  const [prefetchTriggerOverride, setPrefetchTriggerOverride] = useState<string | null>(null);
  const [prefetchSampleIntervalOverride, setPrefetchSampleIntervalOverride] = useState<string | null>(null);
  const [prefetchSampleHitsOverride, setPrefetchSampleHitsOverride] = useState<string | null>(null);

  const formValues = useMemo(
    () => ({
      saveCache: saveCacheOverride ?? settings?.saveCache ?? true,
      serveStale: serveStaleOverride ?? settings?.serveStale ?? true,
      serveStaleTtl: serveStaleTtlOverride ?? String(settings?.serveStaleTtl ?? 259200),
      serveStaleAnswerTtl: serveStaleAnswerTtlOverride ?? String(settings?.serveStaleAnswerTtl ?? 30),
      serveStaleResetTtl: serveStaleResetTtlOverride ?? String(settings?.serveStaleResetTtl ?? 30),
      serveStaleMaxWait: serveStaleMaxWaitOverride ?? String(settings?.serveStaleMaxWaitTime ?? 1800),
      maxEntries: maxEntriesOverride ?? String(settings?.cacheMaximumEntries ?? 10000),
      minTtl: minTtlOverride ?? String(settings?.cacheMinimumRecordTtl ?? 10),
      maxTtl: maxTtlOverride ?? String(settings?.cacheMaximumRecordTtl ?? 604800),
      negativeTtl: negativeTtlOverride ?? String(settings?.cacheNegativeRecordTtl ?? 300),
      failureTtl: failureTtlOverride ?? String(settings?.cacheFailureRecordTtl ?? 10),
      prefetchEligibility: prefetchEligibilityOverride ?? String(settings?.cachePrefetchEligibility ?? 2),
      prefetchTrigger: prefetchTriggerOverride ?? String(settings?.cachePrefetchTrigger ?? 9),
      prefetchSampleInterval: prefetchSampleIntervalOverride ?? String(settings?.cachePrefetchSampleIntervalInMinutes ?? 5),
      prefetchSampleHits: prefetchSampleHitsOverride ?? String(settings?.cachePrefetchSampleEligibilityHitsPerHour ?? 30),
    }),
    [
      settings,
      saveCacheOverride,
      serveStaleOverride,
      serveStaleTtlOverride,
      serveStaleAnswerTtlOverride,
      serveStaleResetTtlOverride,
      serveStaleMaxWaitOverride,
      maxEntriesOverride,
      minTtlOverride,
      maxTtlOverride,
      negativeTtlOverride,
      failureTtlOverride,
      prefetchEligibilityOverride,
      prefetchTriggerOverride,
      prefetchSampleIntervalOverride,
      prefetchSampleHitsOverride,
    ]
  );

  const hasChanges =
    saveCacheOverride !== null ||
    serveStaleOverride !== null ||
    serveStaleTtlOverride !== null ||
    serveStaleAnswerTtlOverride !== null ||
    serveStaleResetTtlOverride !== null ||
    serveStaleMaxWaitOverride !== null ||
    maxEntriesOverride !== null ||
    minTtlOverride !== null ||
    maxTtlOverride !== null ||
    negativeTtlOverride !== null ||
    failureTtlOverride !== null ||
    prefetchEligibilityOverride !== null ||
    prefetchTriggerOverride !== null ||
    prefetchSampleIntervalOverride !== null ||
    prefetchSampleHitsOverride !== null;

  const clearOverrides = () => {
    setSaveCacheOverride(null);
    setServeStaleOverride(null);
    setServeStaleTtlOverride(null);
    setServeStaleAnswerTtlOverride(null);
    setServeStaleResetTtlOverride(null);
    setServeStaleMaxWaitOverride(null);
    setMaxEntriesOverride(null);
    setMinTtlOverride(null);
    setMaxTtlOverride(null);
    setNegativeTtlOverride(null);
    setFailureTtlOverride(null);
    setPrefetchEligibilityOverride(null);
    setPrefetchTriggerOverride(null);
    setPrefetchSampleIntervalOverride(null);
    setPrefetchSampleHitsOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const success = await onSave({
      saveCache: formValues.saveCache,
      serveStale: formValues.serveStale,
      serveStaleTtl: parseInt(formValues.serveStaleTtl, 10) || 259200,
      serveStaleAnswerTtl: parseInt(formValues.serveStaleAnswerTtl, 10) || 30,
      serveStaleResetTtl: parseInt(formValues.serveStaleResetTtl, 10) || 30,
      serveStaleMaxWaitTime: parseInt(formValues.serveStaleMaxWait, 10) || 1800,
      cacheMaximumEntries: parseInt(formValues.maxEntries, 10) || 10000,
      cacheMinimumRecordTtl: parseInt(formValues.minTtl, 10) || 10,
      cacheMaximumRecordTtl: parseInt(formValues.maxTtl, 10) || 604800,
      cacheNegativeRecordTtl: parseInt(formValues.negativeTtl, 10) || 300,
      cacheFailureRecordTtl: parseInt(formValues.failureTtl, 10) || 10,
      cachePrefetchEligibility: parseInt(formValues.prefetchEligibility, 10) || 2,
      cachePrefetchTrigger: parseInt(formValues.prefetchTrigger, 10) || 9,
      cachePrefetchSampleIntervalInMinutes: parseInt(formValues.prefetchSampleInterval, 10) || 5,
      cachePrefetchSampleEligibilityHitsPerHour: parseInt(formValues.prefetchSampleHits, 10) || 30,
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
      {/* General Cache Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Settings
          </CardTitle>
          <CardDescription>
            Configure DNS cache behavior and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="saveCache">Save Cache to Disk</Label>
              <p className="text-xs text-muted-foreground">
                Persist cache when server stops (loads on restart)
              </p>
            </div>
            <Switch
              id="saveCache"
              checked={formValues.saveCache}
              onCheckedChange={(checked) => setSaveCacheOverride(checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxEntries">Maximum Cache Entries</Label>
            <Input
              id="maxEntries"
              type="number"
              min={1000}
              className="w-40"
              value={formValues.maxEntries}
              onChange={(e) => setMaxEntriesOverride(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minTtl">Min TTL (sec)</Label>
              <Input
                id="minTtl"
                type="number"
                min={0}
                value={formValues.minTtl}
                onChange={(e) => setMinTtlOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTtl">Max TTL (sec)</Label>
              <Input
                id="maxTtl"
                type="number"
                min={0}
                value={formValues.maxTtl}
                onChange={(e) => setMaxTtlOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="negativeTtl">Negative TTL (sec)</Label>
              <Input
                id="negativeTtl"
                type="number"
                min={0}
                value={formValues.negativeTtl}
                onChange={(e) => setNegativeTtlOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="failureTtl">Failure TTL (sec)</Label>
              <Input
                id="failureTtl"
                type="number"
                min={0}
                value={formValues.failureTtl}
                onChange={(e) => setFailureTtlOverride(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serve Stale */}
      <Card>
        <CardHeader>
          <CardTitle>Serve Stale Records</CardTitle>
          <CardDescription>
            Serve expired records when upstream servers are unavailable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="serveStale">Enable Serve Stale</Label>
              <p className="text-xs text-muted-foreground">
                Improve resilience by serving stale records during outages
              </p>
            </div>
            <Switch
              id="serveStale"
              checked={formValues.serveStale}
              onCheckedChange={(checked) => setServeStaleOverride(checked)}
            />
          </div>

          {formValues.serveStale && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serveStaleTtl">Stale TTL (sec)</Label>
                <Input
                  id="serveStaleTtl"
                  type="number"
                  min={0}
                  value={formValues.serveStaleTtl}
                  onChange={(e) => setServeStaleTtlOverride(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Max age for stale records</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serveStaleAnswerTtl">Answer TTL (sec)</Label>
                <Input
                  id="serveStaleAnswerTtl"
                  type="number"
                  min={0}
                  max={300}
                  value={formValues.serveStaleAnswerTtl}
                  onChange={(e) => setServeStaleAnswerTtlOverride(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">TTL in stale responses</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serveStaleResetTtl">Reset TTL (sec)</Label>
                <Input
                  id="serveStaleResetTtl"
                  type="number"
                  min={10}
                  max={900}
                  value={formValues.serveStaleResetTtl}
                  onChange={(e) => setServeStaleResetTtlOverride(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">TTL reset on serve</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serveStaleMaxWait">Max Wait (ms)</Label>
                <Input
                  id="serveStaleMaxWait"
                  type="number"
                  min={0}
                  max={1800}
                  value={formValues.serveStaleMaxWait}
                  onChange={(e) => setServeStaleMaxWaitOverride(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Wait before serving stale</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prefetch */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Prefetching</CardTitle>
          <CardDescription>
            Automatically refresh popular records before they expire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefetchEligibility">Eligibility TTL (sec)</Label>
              <Input
                id="prefetchEligibility"
                type="number"
                min={0}
                value={formValues.prefetchEligibility}
                onChange={(e) => setPrefetchEligibilityOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Min TTL for prefetch</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefetchTrigger">Trigger TTL (sec)</Label>
              <Input
                id="prefetchTrigger"
                type="number"
                min={0}
                value={formValues.prefetchTrigger}
                onChange={(e) => setPrefetchTriggerOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">TTL to trigger prefetch (0 to disable)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefetchSampleInterval">Sample Interval (min)</Label>
              <Input
                id="prefetchSampleInterval"
                type="number"
                min={1}
                value={formValues.prefetchSampleInterval}
                onChange={(e) => setPrefetchSampleIntervalOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Auto-prefetch sampling</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefetchSampleHits">Sample Hits/Hour</Label>
              <Input
                id="prefetchSampleHits"
                type="number"
                min={1}
                value={formValues.prefetchSampleHits}
                onChange={(e) => setPrefetchSampleHitsOverride(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Min hits for auto-prefetch</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
