import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfigFormView } from './ConfigFormView';
import { getAppConfig } from '@/api/dns';
import type { InstalledApp } from '@/api/dns';

const ConfigRawEditor = lazy(() =>
  import('./ConfigRawEditor').then((m) => ({ default: m.ConfigRawEditor }))
);

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function isNoConfigMessage(text: string): boolean {
  if (!text || !text.trim()) return true;
  // Config is only comments (lines starting with # or //) with no real data
  const lines = text.trim().split('\n');
  return lines.every((line) => {
    const trimmed = line.trim();
    return !trimmed || trimmed.startsWith('#') || trimmed.startsWith('//');
  });
}

interface AppConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: InstalledApp | null;
  onSave: (name: string, config: string) => Promise<void>;
  processing: boolean;
}

export function AppConfigDialog({
  open,
  onOpenChange,
  app,
  onSave,
  processing,
}: AppConfigDialogProps) {
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('form');
  const [initialized, setInitialized] = useState(false);

  const loadConfig = useCallback(async (appName: string) => {
    setLoading(true);
    setInitialized(false);
    const response = await getAppConfig(appName);
    let text = '';
    if (response.status === 'ok' && response.response) {
      const raw = response.response.config || '';
      try {
        const parsed = JSON.parse(raw);
        text = JSON.stringify(parsed, null, 2);
      } catch {
        text = raw;
      }
    }
    setConfigText(text);
    setActiveTab(isValidJson(text) ? 'form' : 'raw');
    setLoading(false);
    setInitialized(true);
  }, []);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen && app && !initialized) {
      loadConfig(app.name);
    }
    onOpenChange(nextOpen);
  }, [app, initialized, loadConfig, onOpenChange]);

  // Load config when dialog opens with a new app
  useEffect(() => {
    if (open && app && !initialized && !loading) {
      loadConfig(app.name);
    }
  }, [open, app, initialized, loading, loadConfig]);

  const noConfig = useMemo(() => initialized && isNoConfigMessage(configText), [initialized, configText]);

  const handleSave = async () => {
    if (!app) return;
    await onSave(app.name, configText);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setInitialized(false);
      setConfigText('');
    }
    handleOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{app?.name} Configuration</DialogTitle>
          <DialogDescription>
            Edit the <span className="font-mono text-xs">dnsApp.config</span> file for this application.
          </DialogDescription>
        </DialogHeader>

        {loading || !initialized ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : noConfig ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Info className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium">No configuration required</p>
            <p className="text-sm text-muted-foreground mt-1">
              This app does not require any configuration.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="form" className="flex-1 sm:flex-initial">
                  Form
                </TabsTrigger>
                <TabsTrigger value="raw" className="flex-1 sm:flex-initial">
                  Raw JSON
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="form" className="flex-1 min-h-0 overflow-y-auto px-6 py-4 mt-0">
              <ConfigFormView value={configText} onChange={setConfigText} />
            </TabsContent>

            <TabsContent value="raw" className="flex-1 min-h-0 px-6 py-4 mt-0 flex flex-col overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <ConfigRawEditor value={configText} onChange={setConfigText} />
              </Suspense>
            </TabsContent>
          </Tabs>
        )}

        <div className="px-6 pb-4 pt-2 border-t shrink-0">
          {noConfig ? (
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert className="py-2">
                <AlertDescription className="text-xs">
                  The app will reload its configuration automatically after saving.
                </AlertDescription>
              </Alert>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={processing || loading}>
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
