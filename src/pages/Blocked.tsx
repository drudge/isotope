import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Shield,
  ShieldOff,
  ShieldCheck,
  ShieldX,
  List,
  Settings2,
  RefreshCw,
  Clock,
  Zap,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BlockListManager,
  DomainList,
  BlockingSettingsForm,
} from '@/components/blocking';
import QueryLogsModal from '@/components/QueryLogsModal';
import {
  getBlockingSettings,
  updateBlockingSettings,
  forceUpdateBlockLists,
  temporaryDisableBlocking,
} from '@/api/blocking';
import {
  listBlockedZones,
  addBlockedZone,
  deleteBlockedZone,
  flushBlockedZones,
  importBlockedZones,
  listAllowedZones,
  addAllowedZone,
  deleteAllowedZone,
  flushAllowedZones,
  importAllowedZones,
} from '@/api/zones';
import { getStats } from '@/api/dns';
import { toast } from 'sonner';
import type { BlockingSettings, BlockingType } from '@/types/api';

type TabValue = 'lists' | 'blocked' | 'allowed' | 'settings';

export default function Blocked() {
  useDocumentTitle('DNS Blocking');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBlockedLogsModal, setShowBlockedLogsModal] = useState(false);
  const currentTab = (searchParams.get('tab') as TabValue) || 'lists';

  const {
    data: blockingSettings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useApi(() => getBlockingSettings(), []);

  const {
    data: blockedData,
    isLoading: blockedLoading,
    refetch: refetchBlocked,
  } = useApi(() => listBlockedZones(), []);

  const {
    data: allowedData,
    isLoading: allowedLoading,
    refetch: refetchAllowed,
  } = useApi(() => listAllowedZones(), []);

  const { data: statsData, isLoading: statsLoading } = useApi(
    () => getStats('LastHour'),
    []
  );

  const blockedZones = useMemo(() => blockedData?.zones ?? [], [blockedData?.zones]);
  const allowedZones = useMemo(() => allowedData?.zones ?? [], [allowedData?.zones]);
  const settings = blockingSettings as BlockingSettings | null;

  const stats = statsData?.stats;
  const totalBlocked = stats?.totalBlocked ?? 0;
  const blockListZones = stats?.blockListZones ?? 0;

  const isEnabled = settings?.enableBlocking ?? false;
  const tempDisabledUntil = settings?.temporaryDisableBlockingTill;
  const isTempDisabled = tempDisabledUntil && new Date(tempDisabledUntil) > new Date();
  const blockListCount = settings?.blockListUrls?.length ?? 0;

  const handleTabChange = (value: string) => {
    if (value === 'lists') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  // Blocking toggle handler
  const handleToggleBlocking = useCallback(async () => {
    const newState = !isEnabled;
    const response = await updateBlockingSettings({ enableBlocking: newState });
    if (response.status === 'ok') {
      toast.success(newState ? 'DNS blocking enabled' : 'DNS blocking disabled');
      refetchSettings();
    } else {
      toast.error(response.errorMessage || 'Failed to update blocking status');
    }
  }, [isEnabled, refetchSettings]);

  // Temporary disable handler
  const handleTempDisable = useCallback(async (minutes: number) => {
    const response = await temporaryDisableBlocking(minutes);
    if (response.status === 'ok') {
      toast.success(`Blocking disabled for ${minutes} minutes`);
      refetchSettings();
    } else {
      toast.error(response.errorMessage || 'Failed to disable blocking');
    }
  }, [refetchSettings]);

  // Force update handler
  const handleForceUpdate = useCallback(async () => {
    setIsUpdating(true);
    const response = await forceUpdateBlockLists();
    if (response.status === 'ok') {
      toast.success('Block lists update started');
      refetchSettings();
    } else {
      toast.error(response.errorMessage || 'Failed to start block list update');
    }
    setIsUpdating(false);
  }, [refetchSettings]);

  // Block list URL handlers
  const handleAddBlockListUrl = useCallback(async (url: string) => {
    const currentUrls = settings?.blockListUrls ?? [];
    const response = await updateBlockingSettings({
      blockListUrls: [...currentUrls, url],
    });
    if (response.status === 'ok') {
      toast.success('Block list added');
      refetchSettings();
    } else {
      toast.error(response.errorMessage || 'Failed to add block list');
      throw new Error(response.errorMessage || 'Failed to add block list');
    }
  }, [settings, refetchSettings]);

  const handleRemoveBlockListUrl = useCallback(async (url: string) => {
    const currentUrls = settings?.blockListUrls ?? [];
    const response = await updateBlockingSettings({
      blockListUrls: currentUrls.filter((u) => u !== url),
    });
    if (response.status === 'ok') {
      toast.success('Block list removed');
      refetchSettings();
    } else {
      toast.error(response.errorMessage || 'Failed to remove block list');
    }
  }, [settings, refetchSettings]);

  const handleUpdateInterval = useCallback(async (hours: number) => {
    const response = await updateBlockingSettings({
      blockListUpdateIntervalHours: hours,
    });
    if (response.status === 'ok') {
      toast.success(`Update interval set to ${hours} hours`);
      refetchSettings();
    } else {
      toast.error(response.errorMessage || 'Failed to update interval');
    }
  }, [refetchSettings]);

  // Blocked domain handlers
  const handleAddBlockedDomain = useCallback(async (domain: string) => {
    const response = await addBlockedZone(domain);
    if (response.status === 'ok') {
      toast.success(`"${domain}" added to blocked list`);
      refetchBlocked();
    } else {
      toast.error(response.errorMessage || 'Failed to add domain');
    }
  }, [refetchBlocked]);

  const handleDeleteBlockedDomain = useCallback(async (domain: string) => {
    const response = await deleteBlockedZone(domain);
    if (response.status === 'ok') {
      toast.success(`"${domain}" removed from blocked list`);
      refetchBlocked();
    } else {
      toast.error(response.errorMessage || 'Failed to remove domain');
    }
  }, [refetchBlocked]);

  const handleFlushBlocked = useCallback(async () => {
    const response = await flushBlockedZones();
    if (response.status === 'ok') {
      toast.success('All blocked domains cleared');
      refetchBlocked();
    } else {
      toast.error(response.errorMessage || 'Failed to clear blocked domains');
    }
  }, [refetchBlocked]);

  const handleImportBlocked = useCallback(async (domains: string[]) => {
    const response = await importBlockedZones(domains);
    if (response.status === 'ok') {
      toast.success(`Imported ${domains.length} domains to blocked list`);
      refetchBlocked();
    } else {
      toast.error(response.errorMessage || 'Failed to import domains');
    }
  }, [refetchBlocked]);

  const handleExportBlocked = useCallback(() => {
    const content = blockedZones.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blocked-domains.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [blockedZones]);

  // Allowed domain handlers
  const handleAddAllowedDomain = useCallback(async (domain: string) => {
    const response = await addAllowedZone(domain);
    if (response.status === 'ok') {
      toast.success(`"${domain}" added to allowed list`);
      refetchAllowed();
    } else {
      toast.error(response.errorMessage || 'Failed to add domain');
    }
  }, [refetchAllowed]);

  const handleDeleteAllowedDomain = useCallback(async (domain: string) => {
    const response = await deleteAllowedZone(domain);
    if (response.status === 'ok') {
      toast.success(`"${domain}" removed from allowed list`);
      refetchAllowed();
    } else {
      toast.error(response.errorMessage || 'Failed to remove domain');
    }
  }, [refetchAllowed]);

  const handleFlushAllowed = useCallback(async () => {
    const response = await flushAllowedZones();
    if (response.status === 'ok') {
      toast.success('All allowed domains cleared');
      refetchAllowed();
    } else {
      toast.error(response.errorMessage || 'Failed to clear allowed domains');
    }
  }, [refetchAllowed]);

  const handleImportAllowed = useCallback(async (domains: string[]) => {
    const response = await importAllowedZones(domains);
    if (response.status === 'ok') {
      toast.success(`Imported ${domains.length} domains to allowed list`);
      refetchAllowed();
    } else {
      toast.error(response.errorMessage || 'Failed to import domains');
    }
  }, [refetchAllowed]);

  const handleExportAllowed = useCallback(() => {
    const content = allowedZones.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allowed-domains.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [allowedZones]);

  // Settings save handler
  const handleSaveSettings = useCallback(async (newSettings: {
    blockingType: BlockingType;
    blockingAnswerTtl: number;
    customBlockingAddresses: string[];
    blockingBypassList: string[];
    allowTxtBlockingReport: boolean;
  }) => {
    const response = await updateBlockingSettings(newSettings);
    if (response.status === 'ok') {
      toast.success('Blocking settings saved');
      refetchSettings();
    } else {
      toast.error(response.errorMessage || 'Failed to save settings');
    }
  }, [refetchSettings]);

  const formatTempDisabledTime = () => {
    if (!tempDisabledUntil) return '';
    const d = new Date(tempDisabledUntil);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / 60000);
    if (diffMins <= 0) return '';
    if (diffMins === 1) return '1 min remaining';
    return `${diffMins} min remaining`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DNS Blocking</h1>
        <p className="text-muted-foreground mt-1">
          Block unwanted domains using block lists and custom rules
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {isEnabled && !isTempDisabled ? (
                      <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <ShieldOff className="h-6 w-6 text-muted-foreground" />
                    )}
                    Blocking Status
                  </CardTitle>
                  <CardDescription>
                    {isEnabled && !isTempDisabled
                      ? 'DNS blocking is active and protecting your network'
                      : isTempDisabled
                        ? `Temporarily disabled - ${formatTempDisabledTime()}`
                        : 'DNS blocking is currently disabled'}
                  </CardDescription>
                </div>
                <Button
                  variant={isEnabled ? 'outline' : 'default'}
                  onClick={handleToggleBlocking}
                  disabled={settingsLoading}
                >
                  {isEnabled ? (
                    <>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Enable
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowBlockedLogsModal(true)}
                  className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 border border-red-200 dark:border-red-800 text-left transition-all hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-medium text-red-900 dark:text-red-100">
                      Blocked (Last Hour)
                    </span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold text-red-900 dark:text-red-50">
                      {totalBlocked.toLocaleString()}
                    </div>
                  )}
                </button>

                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <List className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      Domains in Block Lists
                    </span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                      {blockListZones.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                      Active Block Lists
                    </span>
                  </div>
                  {settingsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-50">
                      {blockListCount}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!isEnabled || settingsLoading}>
                      <Clock className="h-4 w-4 mr-2" />
                      Pause Blocking
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleTempDisable(5)}>
                      5 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTempDisable(15)}>
                      15 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTempDisable(30)}>
                      30 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTempDisable(60)}>
                      1 hour
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleForceUpdate}
                  disabled={isUpdating || settingsLoading || blockListCount === 0}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                  Update Block Lists
                </Button>

                {settings?.blockListNextUpdatedOn && blockListCount > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Next update:{' '}
                    {new Date(settings.blockListNextUpdatedOn).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="lists" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Block Lists</span>
              </TabsTrigger>
              <TabsTrigger value="blocked" className="gap-2">
                <ShieldX className="h-4 w-4" />
                <span className="hidden sm:inline">Blocked</span>
              </TabsTrigger>
              <TabsTrigger value="allowed" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Allowed</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lists" className="mt-6">
              <BlockListManager
                settings={settings}
                isLoading={settingsLoading}
                onAddUrl={handleAddBlockListUrl}
                onRemoveUrl={handleRemoveBlockListUrl}
                onUpdateInterval={handleUpdateInterval}
              />
            </TabsContent>

            <TabsContent value="blocked" className="mt-6">
              <DomainList
                type="blocked"
                domains={blockedZones}
                isLoading={blockedLoading}
                onAdd={handleAddBlockedDomain}
                onDelete={handleDeleteBlockedDomain}
                onFlush={handleFlushBlocked}
                onImport={handleImportBlocked}
                onExport={handleExportBlocked}
              />
            </TabsContent>

            <TabsContent value="allowed" className="mt-6">
              <DomainList
                type="allowed"
                domains={allowedZones}
                isLoading={allowedLoading}
                onAdd={handleAddAllowedDomain}
                onDelete={handleDeleteAllowedDomain}
                onFlush={handleFlushAllowed}
                onImport={handleImportAllowed}
                onExport={handleExportAllowed}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <BlockingSettingsForm
                settings={settings}
                isLoading={settingsLoading}
                onSave={handleSaveSettings}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Guidance (1/3 width) */}
        <div className="space-y-6">
          {/* How It Works Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How DNS Blocking Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Block Lists</p>
                  <p className="text-sm text-muted-foreground">
                    Subscribe to curated lists that automatically block ads, trackers, and malware
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Custom Blocked Domains</p>
                  <p className="text-sm text-muted-foreground">
                    Manually add specific domains you want to block
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Allowed Domains</p>
                  <p className="text-sm text-muted-foreground">
                    Override blocks for domains you need to access
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Popular Block Lists Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Popular Block Lists</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Steven Black's Hosts</p>
                  <p className="text-muted-foreground text-xs">Ads, malware, fakenews</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">OISD</p>
                  <p className="text-muted-foreground text-xs">Comprehensive blocking</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">AdGuard DNS Filter</p>
                  <p className="text-muted-foreground text-xs">Ads and tracking</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tip Box */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> Block lists update automatically every{' '}
              {settings?.blockListUpdateIntervalHours ?? 24} hours. Change this in the Settings tab.
            </p>
          </div>
        </div>
      </div>

      {/* Query Logs Modal for Blocked Queries */}
      <QueryLogsModal
        open={showBlockedLogsModal}
        onClose={() => setShowBlockedLogsModal(false)}
        initialFilter={{ responseType: 'Blocked' }}
      />
    </div>
  );
}
