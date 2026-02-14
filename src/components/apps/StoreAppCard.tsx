import { useState, useRef, useEffect } from 'react';
import { Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StoreApp } from '@/api/dns';

interface StoreAppCardProps {
  app: StoreApp;
  processing: boolean;
  onInstall: (app: StoreApp) => void;
  onUpdate: (app: StoreApp) => void;
}

export function StoreAppCard({
  app,
  processing,
  onInstall,
  onUpdate,
}: StoreAppCardProps) {
  const isInstalled = app.installed;
  const hasUpdate = app.updateAvailable;
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = descRef.current;
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight);
    }
  }, [app.description]);

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
              {isInstalled && !hasUpdate && (
                <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                  <Check className="h-3 w-3" />
                  Installed
                </Badge>
              )}
              {hasUpdate && (
                <Badge className="text-[10px] shrink-0">
                  Update
                </Badge>
              )}
            </div>
          </div>
        </div>
        {app.description && (
          <div className="mt-1.5">
            <p
              ref={descRef}
              className={`text-sm text-muted-foreground ${!expanded ? 'line-clamp-2' : ''}`}
            >
              {app.description}
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
      </CardHeader>
      <CardFooter className="pt-0 pb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{app.size}</span>
        {isInstalled ? (
          hasUpdate ? (
            <Button
              size="sm"
              onClick={() => onUpdate(app)}
              disabled={processing}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Update
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Installed
            </Button>
          )
        ) : (
          <Button
            size="sm"
            onClick={() => onInstall(app)}
            disabled={processing}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
