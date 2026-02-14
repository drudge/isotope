import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { Store, Upload, Package } from 'lucide-react';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  listApps,
  listStoreApps,
  downloadAndInstallApp,
  downloadAndUpdateApp,
  installApp,
  uninstallApp,
  getAppConfig,
  setAppConfig,
  type InstalledApp,
  type StoreApp,
} from '@/api/dns';
import { toast } from 'sonner';
import { InstalledAppsTab } from '@/components/apps/InstalledAppsTab';
import { AppStoreTab } from '@/components/apps/AppStoreTab';
import { AppConfigDialog } from '@/components/apps/AppConfigDialog';
import { InstallAppDialog } from '@/components/apps/InstallAppDialog';

type TabValue = 'installed' | 'store';

export default function Apps() {
  useDocumentTitle('Apps');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabValue) || 'installed';

  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [storeApps, setStoreApps] = useState<StoreApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Track which apps have real config (not just comments or empty)
  const [appsWithConfig, setAppsWithConfig] = useState<Set<string>>(new Set());

  // Dialog state
  const [showInstall, setShowInstall] = useState(false);
  const [configApp, setConfigApp] = useState<InstalledApp | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<string | null>(null);

  const checkAppConfigs = useCallback(async (apps: InstalledApp[]) => {
    const results = await Promise.all(
      apps.map(async (app) => {
        const response = await getAppConfig(app.name);
        if (response.status === 'ok' && response.response) {
          const raw = (response.response.config || '').trim();
          if (!raw) return null;
          // Check if config is only comments
          const lines = raw.split('\n');
          const isOnlyComments = lines.every((line) => {
            const trimmed = line.trim();
            return !trimmed || trimmed.startsWith('#') || trimmed.startsWith('//');
          });
          return isOnlyComments ? null : app.name;
        }
        return null;
      })
    );
    setAppsWithConfig(new Set(results.filter((n): n is string => n !== null)));
  }, []);

  const fetchInstalledApps = useCallback(async () => {
    const response = await listApps();
    if (response.status === 'ok' && response.response) {
      const apps = response.response.apps || [];
      setInstalledApps(apps);
      return apps;
    }
    return [];
  }, []);

  const fetchStoreApps = useCallback(async () => {
    const response = await listStoreApps();
    if (response.status === 'ok' && response.response) {
      setStoreApps(response.response.storeApps || []);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [apps] = await Promise.all([fetchInstalledApps(), fetchStoreApps()]);
      setLoading(false);
      // Check configs in background after page renders
      if (apps.length > 0) {
        checkAppConfigs(apps).catch(() => {});
      }
    };
    loadData();
  }, [fetchInstalledApps, fetchStoreApps, checkAppConfigs]);

  const handleTabChange = (value: string) => {
    if (value === 'installed') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleInstallFromStore = async (app: StoreApp) => {
    setProcessing(true);
    const response = await downloadAndInstallApp(app.name, app.url);
    setProcessing(false);
    if (response.status === 'ok') {
      toast.success(`${app.name} installed successfully`);
      await Promise.all([fetchInstalledApps(), fetchStoreApps()]);
    } else {
      toast.error(response.errorMessage || 'Failed to install app');
    }
  };

  const handleUpdateFromStore = async (app: StoreApp) => {
    setProcessing(true);
    const response = await downloadAndUpdateApp(app.name, app.url);
    setProcessing(false);
    if (response.status === 'ok') {
      toast.success(`${app.name} updated successfully`);
      await Promise.all([fetchInstalledApps(), fetchStoreApps()]);
    } else {
      toast.error(response.errorMessage || 'Failed to update app');
    }
  };

  const handleInstallFromFile = async (name: string, file: File) => {
    setProcessing(true);
    const response = await installApp(name, file);
    setProcessing(false);
    if (response.status === 'ok') {
      toast.success(`${name} installed successfully`);
      setShowInstall(false);
      await fetchInstalledApps();
    } else {
      toast.error(response.errorMessage || 'Failed to install app');
    }
  };

  const handleConfirmUninstall = async () => {
    if (!uninstallTarget) return;
    setProcessing(true);
    const response = await uninstallApp(uninstallTarget);
    setProcessing(false);
    if (response.status === 'ok') {
      toast.success(`${uninstallTarget} uninstalled successfully`);
      setUninstallTarget(null);
      await fetchInstalledApps();
    } else {
      toast.error(response.errorMessage || 'Failed to uninstall app');
    }
  };

  const handleSaveConfig = async (name: string, config: string) => {
    setProcessing(true);
    const response = await setAppConfig(name, config);
    setProcessing(false);
    if (response.status === 'ok') {
      toast.success('Configuration saved');
      setConfigApp(null);
    } else {
      toast.error(response.errorMessage || 'Failed to save config');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IsotopeSpinner size="md" className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Apps</h1>
          <p className="text-muted-foreground mt-1">
            Manage DNS applications and extensions
          </p>
        </div>
        <Button onClick={() => setShowInstall(true)} className="gap-2 shrink-0 w-full sm:w-auto">
          <Upload className="h-4 w-4" />
          Install from File
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="installed" className="gap-1.5 sm:flex-initial">
            <Package className="h-4 w-4" />
            Installed
            <Badge variant="secondary" className="text-[10px] ml-0.5 px-1.5 min-w-[1.25rem] justify-center">
              {installedApps.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="store" className="gap-1.5 sm:flex-initial">
            <Store className="h-4 w-4" />
            App Store
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6">
          <InstalledAppsTab
            apps={installedApps}
            storeApps={storeApps}
            appsWithConfig={appsWithConfig}
            processing={processing}
            onConfig={setConfigApp}
            onUpdate={handleUpdateFromStore}
            onUninstall={setUninstallTarget}
          />
        </TabsContent>

        <TabsContent value="store" className="mt-6">
          <AppStoreTab
            apps={storeApps}
            processing={processing}
            onInstall={handleInstallFromStore}
            onUpdate={handleUpdateFromStore}
          />
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <AppConfigDialog
        open={!!configApp}
        onOpenChange={(open) => { if (!open) setConfigApp(null); }}
        app={configApp}
        onSave={handleSaveConfig}
        processing={processing}
      />

      {/* Install from File Dialog */}
      <InstallAppDialog
        open={showInstall}
        onOpenChange={setShowInstall}
        onInstall={handleInstallFromFile}
        processing={processing}
      />

      {/* Uninstall Confirmation */}
      <AlertDialog open={!!uninstallTarget} onOpenChange={(open) => { if (!open) setUninstallTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall {uninstallTarget}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the app from the DNS server. Any APP records using this application will not be removed automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUninstall}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
