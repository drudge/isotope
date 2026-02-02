import { useState, useMemo } from 'react';
import { Save, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DnsSettings, DnsSettingsUpdate, ProxyType, ForwarderProtocol } from '@/types/settings';

interface ProxyForwardersSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

export default function ProxyForwardersSettings({
  settings,
  isLoading,
  onSave,
}: ProxyForwardersSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Proxy overrides
  const [proxyTypeOverride, setProxyTypeOverride] = useState<ProxyType | null>(null);
  const [proxyAddressOverride, setProxyAddressOverride] = useState<string | null>(null);
  const [proxyPortOverride, setProxyPortOverride] = useState<string | null>(null);
  const [proxyUsernameOverride, setProxyUsernameOverride] = useState<string | null>(null);
  const [proxyPasswordOverride, setProxyPasswordOverride] = useState<string | null>(null);
  const [proxyBypassOverride, setProxyBypassOverride] = useState<string | null>(null);

  // Forwarder overrides
  const [forwardersOverride, setForwardersOverride] = useState<string | null>(null);
  const [forwarderProtocolOverride, setForwarderProtocolOverride] = useState<ForwarderProtocol | null>(null);
  const [concurrentForwardingOverride, setConcurrentForwardingOverride] = useState<boolean | null>(null);
  const [forwarderRetriesOverride, setForwarderRetriesOverride] = useState<string | null>(null);
  const [forwarderTimeoutOverride, setForwarderTimeoutOverride] = useState<string | null>(null);
  const [forwarderConcurrencyOverride, setForwarderConcurrencyOverride] = useState<string | null>(null);

  const formValues = useMemo(
    () => ({
      proxyType: proxyTypeOverride ?? settings?.proxyType ?? 'None',
      proxyAddress: proxyAddressOverride ?? settings?.proxyAddress ?? '',
      proxyPort: proxyPortOverride ?? String(settings?.proxyPort ?? ''),
      proxyUsername: proxyUsernameOverride ?? settings?.proxyUsername ?? '',
      proxyPassword: proxyPasswordOverride ?? '',
      proxyBypass: proxyBypassOverride ?? settings?.proxyBypass?.join('\n') ?? '',
      forwarders: forwardersOverride ?? settings?.forwarders?.join('\n') ?? '',
      forwarderProtocol: forwarderProtocolOverride ?? settings?.forwarderProtocol ?? 'Udp',
      concurrentForwarding: concurrentForwardingOverride ?? settings?.concurrentForwarding ?? true,
      forwarderRetries: forwarderRetriesOverride ?? String(settings?.forwarderRetries ?? 3),
      forwarderTimeout: forwarderTimeoutOverride ?? String(settings?.forwarderTimeout ?? 2000),
      forwarderConcurrency: forwarderConcurrencyOverride ?? String(settings?.forwarderConcurrency ?? 2),
    }),
    [
      settings,
      proxyTypeOverride,
      proxyAddressOverride,
      proxyPortOverride,
      proxyUsernameOverride,
      proxyPasswordOverride,
      proxyBypassOverride,
      forwardersOverride,
      forwarderProtocolOverride,
      concurrentForwardingOverride,
      forwarderRetriesOverride,
      forwarderTimeoutOverride,
      forwarderConcurrencyOverride,
    ]
  );

  const hasChanges =
    proxyTypeOverride !== null ||
    proxyAddressOverride !== null ||
    proxyPortOverride !== null ||
    proxyUsernameOverride !== null ||
    proxyPasswordOverride !== null ||
    proxyBypassOverride !== null ||
    forwardersOverride !== null ||
    forwarderProtocolOverride !== null ||
    concurrentForwardingOverride !== null ||
    forwarderRetriesOverride !== null ||
    forwarderTimeoutOverride !== null ||
    forwarderConcurrencyOverride !== null;

  const clearOverrides = () => {
    setProxyTypeOverride(null);
    setProxyAddressOverride(null);
    setProxyPortOverride(null);
    setProxyUsernameOverride(null);
    setProxyPasswordOverride(null);
    setProxyBypassOverride(null);
    setForwardersOverride(null);
    setForwarderProtocolOverride(null);
    setConcurrentForwardingOverride(null);
    setForwarderRetriesOverride(null);
    setForwarderTimeoutOverride(null);
    setForwarderConcurrencyOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const parseLines = (text: string) =>
      text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

    const forwardersList = parseLines(formValues.forwarders);

    const updates: DnsSettingsUpdate = {
      proxyType: formValues.proxyType,
      forwarders: forwardersList.length > 0 ? forwardersList : null,
      forwarderProtocol: formValues.forwarderProtocol,
      concurrentForwarding: formValues.concurrentForwarding,
      forwarderRetries: parseInt(formValues.forwarderRetries, 10) || 3,
      forwarderTimeout: parseInt(formValues.forwarderTimeout, 10) || 2000,
      forwarderConcurrency: parseInt(formValues.forwarderConcurrency, 10) || 2,
    };

    if (formValues.proxyType !== 'None') {
      updates.proxyAddress = formValues.proxyAddress;
      updates.proxyPort = parseInt(formValues.proxyPort, 10) || 0;
      updates.proxyUsername = formValues.proxyUsername;
      if (proxyPasswordOverride !== null && formValues.proxyPassword) {
        updates.proxyPassword = formValues.proxyPassword;
      }
      updates.proxyBypass = parseLines(formValues.proxyBypass);
    }

    const success = await onSave(updates);
    if (success) {
      clearOverrides();
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Forwarders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waypoints className="h-5 w-5" />
            DNS Forwarders
          </CardTitle>
          <CardDescription>
            Forward queries to upstream DNS servers instead of recursive resolution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forwarders">Forwarder Addresses</Label>
            <Textarea
              id="forwarders"
              value={formValues.forwarders}
              onChange={(e) => setForwardersOverride(e.target.value)}
              placeholder="8.8.8.8&#10;1.1.1.1&#10;dns.example.com"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              DNS server addresses to forward queries to (one per line). Leave empty for recursive resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="forwarderProtocol">Protocol</Label>
              <Select
                value={formValues.forwarderProtocol}
                onValueChange={(value) => setForwarderProtocolOverride(value as ForwarderProtocol)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Udp">UDP</SelectItem>
                  <SelectItem value="Tcp">TCP</SelectItem>
                  <SelectItem value="Tls">DNS-over-TLS</SelectItem>
                  <SelectItem value="Https">DNS-over-HTTPS</SelectItem>
                  <SelectItem value="Quic">DNS-over-QUIC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="concurrentForwarding">Concurrent Forwarding</Label>
                <p className="text-xs text-muted-foreground">
                  Query multiple forwarders simultaneously
                </p>
              </div>
              <Switch
                id="concurrentForwarding"
                checked={formValues.concurrentForwarding}
                onCheckedChange={(checked) => setConcurrentForwardingOverride(checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="forwarderRetries">Retries</Label>
              <Input
                id="forwarderRetries"
                type="number"
                min={0}
                value={formValues.forwarderRetries}
                onChange={(e) => setForwarderRetriesOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forwarderTimeout">Timeout (ms)</Label>
              <Input
                id="forwarderTimeout"
                type="number"
                min={100}
                value={formValues.forwarderTimeout}
                onChange={(e) => setForwarderTimeoutOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forwarderConcurrency">Concurrency</Label>
              <Input
                id="forwarderConcurrency"
                type="number"
                min={1}
                value={formValues.forwarderConcurrency}
                onChange={(e) => setForwarderConcurrencyOverride(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proxy */}
      <Card>
        <CardHeader>
          <CardTitle>Upstream Proxy</CardTitle>
          <CardDescription>
            Route outbound DNS queries through a proxy server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proxyType">Proxy Type</Label>
            <Select
              value={formValues.proxyType}
              onValueChange={(value) => setProxyTypeOverride(value as ProxyType)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Http">HTTP</SelectItem>
                <SelectItem value="Socks5">SOCKS5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formValues.proxyType !== 'None' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="proxyAddress">Proxy Address</Label>
                  <Input
                    id="proxyAddress"
                    value={formValues.proxyAddress}
                    onChange={(e) => setProxyAddressOverride(e.target.value)}
                    placeholder="proxy.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxyPort">Port</Label>
                  <Input
                    id="proxyPort"
                    type="number"
                    value={formValues.proxyPort}
                    onChange={(e) => setProxyPortOverride(e.target.value)}
                    placeholder="1080"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proxyUsername">Username (optional)</Label>
                  <Input
                    id="proxyUsername"
                    value={formValues.proxyUsername}
                    onChange={(e) => setProxyUsernameOverride(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxyPassword">Password (optional)</Label>
                  <Input
                    id="proxyPassword"
                    type="password"
                    value={formValues.proxyPassword}
                    onChange={(e) => setProxyPasswordOverride(e.target.value)}
                    placeholder="Enter to change"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proxyBypass">Proxy Bypass List</Label>
                <Textarea
                  id="proxyBypass"
                  value={formValues.proxyBypass}
                  onChange={(e) => setProxyBypassOverride(e.target.value)}
                  placeholder="127.0.0.0/8&#10;192.168.0.0/16&#10;localhost"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Addresses and domains that should bypass the proxy (one per line)
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
