import { useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  Server,
  Globe,
  Network,
  Key,
  RefreshCw,
  Database,
  Shield,
  Waypoints,
  FileText,
  Settings2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/useApi';
import { getSettings, updateSettings } from '@/api/settings';
import { toast } from 'sonner';
import type { DnsSettingsUpdate } from '@/types/settings';

import GeneralSettings from '@/components/settings/GeneralSettings';
import WebServiceSettings from '@/components/settings/WebServiceSettings';
import OptionalProtocolsSettings from '@/components/settings/OptionalProtocolsSettings';
import TsigSettings from '@/components/settings/TsigSettings';
import RecursionSettings from '@/components/settings/RecursionSettings';
import CacheSettings from '@/components/settings/CacheSettings';
import ProxyForwardersSettings from '@/components/settings/ProxyForwardersSettings';
import LoggingSettings from '@/components/settings/LoggingSettings';

type TabValue =
  | 'general'
  | 'web-service'
  | 'protocols'
  | 'tsig'
  | 'recursion'
  | 'cache'
  | 'blocking'
  | 'proxy'
  | 'logging';

export default function Settings() {
  useDocumentTitle('Settings');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabValue) || 'general';

  const {
    data: settings,
    isLoading,
    refetch,
  } = useApi(() => getSettings(), []);

  const handleTabChange = (value: string) => {
    if (value === 'general') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSave = useCallback(
    async (updates: DnsSettingsUpdate) => {
      const response = await updateSettings(updates);
      if (response.status === 'ok') {
        toast.success('Settings saved successfully');
        refetch();
        return true;
      } else {
        toast.error(response.errorMessage || 'Failed to save settings');
        return false;
      }
    },
    [refetch]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure DNS server settings and behavior. Some settings may require the DNS server to restart to take effect.
        </p>
      </div>

      {/* Server Status Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Settings2 className="h-6 w-6 text-primary" />
                Server Configuration
              </CardTitle>
              <CardDescription>
                {isLoading ? (
                  <Skeleton className="h-4 w-64" />
                ) : settings ? (
                  <>
                    Technitium DNS Server v{settings.version} •{' '}
                    {settings.dnsServerDomain}
                  </>
                ) : (
                  'Configure your DNS server settings'
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 h-auto gap-1">
          <TabsTrigger value="general" className="gap-1 px-2 py-1.5">
            <Server className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">General</span>
          </TabsTrigger>
          <TabsTrigger value="web-service" className="gap-1 px-2 py-1.5">
            <Globe className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">Web</span>
          </TabsTrigger>
          <TabsTrigger value="protocols" className="gap-1 px-2 py-1.5">
            <Network className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">Protocols</span>
          </TabsTrigger>
          <TabsTrigger value="tsig" className="gap-1 px-2 py-1.5">
            <Key className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">TSIG</span>
          </TabsTrigger>
          <TabsTrigger value="recursion" className="gap-1 px-2 py-1.5">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">Recursion</span>
          </TabsTrigger>
          <TabsTrigger value="cache" className="gap-1 px-2 py-1.5">
            <Database className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">Cache</span>
          </TabsTrigger>
          <TabsTrigger value="blocking" className="gap-1 px-2 py-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">Blocking</span>
          </TabsTrigger>
          <TabsTrigger value="proxy" className="gap-1 px-2 py-1.5">
            <Waypoints className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">Proxy</span>
          </TabsTrigger>
          <TabsTrigger value="logging" className="gap-1 px-2 py-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden xl:inline text-xs">Logging</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="web-service" className="mt-6">
          <WebServiceSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="protocols" className="mt-6">
          <OptionalProtocolsSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="tsig" className="mt-6">
          <TsigSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="recursion" className="mt-6">
          <RecursionSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="cache" className="mt-6">
          <CacheSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="blocking" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                DNS Blocking
              </CardTitle>
              <CardDescription>
                Configure blocking settings, block lists, and allowed/blocked domains
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                DNS blocking settings are managed on a dedicated page with full control over
                block lists, blocked domains, allowed domains, and blocking behavior.
              </p>
              <Button asChild>
                <Link to="/blocked">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage DNS Blocking
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proxy" className="mt-6">
          <ProxyForwardersSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>

        <TabsContent value="logging" className="mt-6">
          <LoggingSettings
            settings={settings ?? undefined}
            isLoading={isLoading}
            onSave={handleSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
