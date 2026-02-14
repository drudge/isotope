import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Info } from 'lucide-react';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onOpenChange(false); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {open && app ? (
          <AppConfigDialogBody
            key={app.name}
            app={app}
            onSave={onSave}
            processing={processing}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogTitle>Configuration</DialogTitle>
              <DialogDescription>Loading configuration...</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-16">
              <IsotopeSpinner size="md" className="text-muted-foreground" />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AppConfigDialogBody({
  app,
  onSave,
  processing,
  onClose,
}: {
  app: InstalledApp;
  onSave: (name: string, config: string) => Promise<void>;
  processing: boolean;
  onClose: () => void;
}) {
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('form');

  useEffect(() => {
    let cancelled = false;
    async function fetchConfig() {
      const response = await getAppConfig(app.name);
      if (cancelled) return;
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
    }
    fetchConfig();
    return () => { cancelled = true; };
  }, [app.name]);

  const noConfig = useMemo(() => !loading && isNoConfigMessage(configText), [loading, configText]);

  const handleSave = async () => {
    await onSave(app.name, configText);
  };

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
        <DialogTitle>{app.name} Configuration</DialogTitle>
        <DialogDescription>
          Edit the <span className="font-mono text-xs">dnsApp.config</span> file for this application.
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <IsotopeSpinner size="md" className="text-muted-foreground" />
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
                  <IsotopeSpinner size="md" className="text-muted-foreground" />
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
            <Button variant="outline" onClick={onClose}>
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
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={processing || loading}>
                Save Configuration
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
