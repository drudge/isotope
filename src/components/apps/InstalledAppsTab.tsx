import { useState, useMemo } from 'react';
import { Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AppCard } from './AppCard';
import type { InstalledApp, StoreApp } from '@/api/dns';

interface InstalledAppsTabProps {
  apps: InstalledApp[];
  storeApps: StoreApp[];
  appsWithConfig: Set<string>;
  processing: boolean;
  onConfig: (app: InstalledApp) => void;
  onUpdate: (app: StoreApp) => void;
  onUninstall: (name: string) => void;
}

export function InstalledAppsTab({
  apps,
  storeApps,
  appsWithConfig,
  processing,
  onConfig,
  onUpdate,
  onUninstall,
}: InstalledAppsTabProps) {
  const [search, setSearch] = useState('');

  const getStoreApp = (name: string) => storeApps.find((a) => a.name === name);
  const hasUpdate = (app: InstalledApp) => {
    const storeApp = getStoreApp(app.name);
    return !!(storeApp && storeApp.version !== app.version);
  };

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.dnsApps?.some((d) => d.description?.toLowerCase().includes(q))
    );
  }, [apps, search]);

  return (
    <div className="space-y-4">
      {apps.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search installed apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filteredApps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            {apps.length === 0 ? (
              <>
                <p className="text-muted-foreground mb-1">No apps installed</p>
                <p className="text-sm text-muted-foreground">
                  Browse the App Store to install DNS applications.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No apps match your search</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <AppCard
              key={app.name}
              app={app}
              storeApp={getStoreApp(app.name)}
              updateAvailable={hasUpdate(app)}
              hasConfig={appsWithConfig.has(app.name)}
              processing={processing}
              onConfig={onConfig}
              onUpdate={onUpdate}
              onUninstall={onUninstall}
            />
          ))}
        </div>
      )}
    </div>
  );
}
