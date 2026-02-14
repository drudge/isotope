import { useState, useRef, useEffect } from 'react';
import { Settings, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CapabilityBadges } from './CapabilityBadge';
import type { InstalledApp, StoreApp } from '@/api/dns';

interface AppCardProps {
  app: InstalledApp;
  storeApp?: StoreApp;
  updateAvailable: boolean;
  hasConfig: boolean;
  processing: boolean;
  onConfig: (app: InstalledApp) => void;
  onUpdate: (app: StoreApp) => void;
  onUninstall: (name: string) => void;
}

export function AppCard({
  app,
  storeApp,
  updateAvailable,
  hasConfig,
  processing,
  onConfig,
  onUpdate,
  onUninstall,
}: AppCardProps) {
  const description = app.dnsApps?.[0]?.description;
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = descRef.current;
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight);
    }
  }, [description]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex-1 content-start">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{app.name}</CardTitle>
              <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                v{app.version}
              </Badge>
              {updateAvailable && (
                <Badge className="text-[10px] shrink-0">
                  Update
                </Badge>
              )}
            </div>
          </div>
        </div>
        {description && (
          <div className="mt-1.5">
            <p
              ref={descRef}
              className={`text-sm text-muted-foreground ${!expanded ? 'line-clamp-2' : ''}`}
            >
              {description}
            </p>
            {clamped && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-muted-foreground hover:text-foreground mt-0.5 cursor-pointer"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
        <div className="mt-2">
          <CapabilityBadges app={app} />
        </div>
      </CardHeader>
      <CardFooter className="pt-0 pb-4 gap-2 flex-wrap">
        {hasConfig && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfig(app)}
            className="gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            Config
          </Button>
        )}
        {updateAvailable && storeApp && (
          <Button
            size="sm"
            onClick={() => onUpdate(storeApp)}
            disabled={processing}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Update
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUninstall(app.name)}
          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950 ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Uninstall</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
