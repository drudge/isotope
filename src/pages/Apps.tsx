import { useState, useEffect } from 'react';
import { RefreshCw, Store, Upload, Settings, Trash2, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function Apps() {
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [storeApps, setStoreApps] = useState<StoreApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStore, setShowStore] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [installName, setInstallName] = useState('');
  const [installFile, setInstallFile] = useState<File | null>(null);
  const [configText, setConfigText] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchInstalledApps = async () => {
    const response = await listApps();
    if (response.status === 'ok' && response.response) {
      setInstalledApps(response.response.apps || []);
    }
  };

  const fetchStoreApps = async () => {
    const response = await listStoreApps();
    if (response.status === 'ok' && response.response) {
      setStoreApps(response.response.storeApps || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInstalledApps(), fetchStoreApps()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleInstallFromStore = async (app: StoreApp) => {
    setProcessing(true);
    const response = await downloadAndInstallApp(app.name, app.url);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success(`${app.name} installed successfully`);
      await fetchInstalledApps();
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
      await fetchInstalledApps();
    } else {
      toast.error(response.errorMessage || 'Failed to update app');
    }
  };

  const handleInstallFromFile = async () => {
    if (!installName.trim() || !installFile) {
      toast.error('Please provide app name and file');
      return;
    }

    setProcessing(true);
    const response = await installApp(installName, installFile);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success(`${installName} installed successfully`);
      await fetchInstalledApps();
      setShowInstall(false);
      setInstallName('');
      setInstallFile(null);
    } else {
      toast.error(response.errorMessage || 'Failed to install app');
    }
  };

  const handleUninstall = async (name: string) => {
    if (!confirm(`Are you sure you want to uninstall ${name}?`)) {
      return;
    }

    setProcessing(true);
    const response = await uninstallApp(name);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success(`${name} uninstalled successfully`);
      await fetchInstalledApps();
    } else {
      toast.error(response.errorMessage || 'Failed to uninstall app');
    }
  };

  const handleOpenConfig = async (app: InstalledApp) => {
    setSelectedApp(app);
    setProcessing(true);
    const response = await getAppConfig(app.name);
    setProcessing(false);

    if (response.status === 'ok' && response.response) {
      setConfigText(response.response.config || '');
      setShowConfig(true);
    } else {
      toast.error(response.errorMessage || 'Failed to load config');
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedApp) return;

    setProcessing(true);
    const response = await setAppConfig(selectedApp.name, configText);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Config saved successfully');
      setShowConfig(false);
    } else {
      toast.error(response.errorMessage || 'Failed to save config');
    }
  };

  const getStoreApp = (appName: string) => {
    return storeApps.find((a) => a.name === appName);
  };

  const hasUpdate = (app: InstalledApp) => {
    const storeApp = getStoreApp(app.name);
    return storeApp && storeApp.version !== app.version;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Installed Apps</h1>
          <p className="text-muted-foreground mt-1">
            Total Apps: {installedApps.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowStore(true)}>
            <Store className="h-4 w-4 mr-2" />
            App Store
          </Button>
          <Button onClick={() => setShowInstall(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Install
          </Button>
        </div>
      </div>

      {/* Installed Apps */}
      {installedApps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground mb-1">No apps installed</p>
            <p className="text-sm text-muted-foreground">
              Install apps from the App Store to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {installedApps.map((app) => {
            const updateAvailable = hasUpdate(app);
            const storeApp = getStoreApp(app.name);

            return (
              <Card key={app.name}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <CardTitle>{app.name}</CardTitle>
                        <Badge variant="secondary">Version {app.version}</Badge>
                        {updateAvailable && storeApp && (
                          <Badge variant="default">Update Available</Badge>
                        )}
                      </div>
                      {app.dnsApps && app.dnsApps.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {app.dnsApps.map((dnsApp, idx) => (
                            <Badge key={idx} variant="outline" className="font-normal">
                              {dnsApp.classPath.split('.').pop()}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {app.dnsApps && app.dnsApps.length > 0 && app.dnsApps[0]?.description && (
                        <CardDescription>
                          {app.dnsApps[0].description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {updateAvailable && storeApp && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateFromStore(storeApp)}
                          disabled={processing}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenConfig(app)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Config
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUninstall(app.name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Uninstall
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      {/* App Store Dialog */}
      <Dialog open={showStore} onOpenChange={setShowStore}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>DNS App Store</DialogTitle>
            <DialogDescription>Store Apps</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 flex-1">
            <div className="space-y-3 py-4">
              {storeApps.map((app) => {
                const installed = installedApps.find((a) => a.name === app.name);
                const updateAvailable = installed && installed.version !== app.version;

                return (
                  <Card key={app.name}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <CardTitle className="text-base">{app.name}</CardTitle>
                            <Badge variant="secondary">v{app.version}</Badge>
                            {installed && (
                              <Badge variant="outline">Installed</Badge>
                            )}
                          </div>
                          <CardDescription className="mb-2">
                            {app.description}
                          </CardDescription>
                          <div className="text-xs text-muted-foreground">
                            <p>Size: {app.size}</p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {installed ? (
                            updateAvailable ? (
                              <Button
                                size="sm"
                                onClick={() => handleUpdateFromStore(app)}
                                disabled={processing}
                              >
                                Update
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Installed
                              </Button>
                            )
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleInstallFromStore(app)}
                              disabled={processing}
                            >
                              Install
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowStore(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Install App Dialog */}
      <Dialog open={showInstall} onOpenChange={setShowInstall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install App</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">App Name</Label>
              <Input
                id="app-name"
                value={installName}
                onChange={(e) => setInstallName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-file">App Zip File</Label>
              <Input
                id="app-file"
                type="file"
                accept=".zip"
                onChange={(e) => setInstallFile(e.target.files?.[0] || null)}
              />
              {installFile && (
                <p className="text-xs text-muted-foreground">
                  No file selected.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstall(false)}>
              Close
            </Button>
            <Button onClick={handleInstallFromFile} disabled={processing}>
              Install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>App Config - {selectedApp?.name}</DialogTitle>
            <DialogDescription>
              Edit the <span className="font-mono text-xs">dnsApp.config</span> config file below as required by the DNS application.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            <Label className="mb-2">Config File</Label>
            <Textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              className="font-mono text-sm flex-1 resize-none min-h-[400px]"
            />
            <Alert className="mt-4">
              <AlertDescription>
                Note: The app will reload the config automatically after you save it.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowConfig(false)}>
              Close
            </Button>
            <Button onClick={handleSaveConfig} disabled={processing}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
