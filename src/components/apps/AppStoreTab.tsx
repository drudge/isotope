import { useState, useMemo } from 'react';
import { Search, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StoreAppCard } from './StoreAppCard';
import type { StoreApp } from '@/api/dns';

interface AppStoreTabProps {
  apps: StoreApp[];
  processing: boolean;
  onInstall: (app: StoreApp) => void;
  onUpdate: (app: StoreApp) => void;
}

export function AppStoreTab({
  apps,
  processing,
  onInstall,
  onUpdate,
}: AppStoreTabProps) {
  const [search, setSearch] = useState('');

  const filteredApps = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.description?.toLowerCase().includes(q)
    );
  }, [apps, search]);

  return (
    <div className="space-y-4">
      {apps.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search the app store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filteredApps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            {apps.length === 0 ? (
              <>
                <p className="text-muted-foreground mb-1">App Store unavailable</p>
                <p className="text-sm text-muted-foreground">
                  Unable to connect to the DNS App Store. Check your server's internet connection.
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
            <StoreAppCard
              key={app.name}
              app={app}
              processing={processing}
              onInstall={onInstall}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
