import { useState, useMemo } from 'react';
import { Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DnsSettings, DnsSettingsUpdate } from '@/types/settings';

interface GeneralSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

export default function GeneralSettings({
  settings,
  isLoading,
  onSave,
}: GeneralSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Override states for each field
  const [dnsServerDomainOverride, setDnsServerDomainOverride] = useState<string | null>(null);
  const [localEndPointsOverride, setLocalEndPointsOverride] = useState<string | null>(null);
  const [ipv4SourceOverride, setIpv4SourceOverride] = useState<string | null>(null);
  const [ipv6SourceOverride, setIpv6SourceOverride] = useState<string | null>(null);
  const [defaultTtlOverride, setDefaultTtlOverride] = useState<string | null>(null);
  const [responsiblePersonOverride, setResponsiblePersonOverride] = useState<string | null>(null);
  const [useSoaDateSchemeOverride, setUseSoaDateSchemeOverride] = useState<boolean | null>(null);
  const [preferIPv6Override, setPreferIPv6Override] = useState<boolean | null>(null);
  const [udpPayloadSizeOverride, setUdpPayloadSizeOverride] = useState<string | null>(null);
  const [zoneTransferNetworksOverride, setZoneTransferNetworksOverride] = useState<string | null>(null);
  const [notifyNetworksOverride, setNotifyNetworksOverride] = useState<string | null>(null);
  const [autoUpdateAppsOverride, setAutoUpdateAppsOverride] = useState<boolean | null>(null);

  // Computed form values
  const formValues = useMemo(
    () => ({
      dnsServerDomain: dnsServerDomainOverride ?? settings?.dnsServerDomain ?? '',
      localEndPoints: localEndPointsOverride ?? settings?.dnsServerLocalEndPoints?.join('\n') ?? '',
      ipv4Source: ipv4SourceOverride ?? settings?.dnsServerIPv4SourceAddresses?.join('\n') ?? '',
      ipv6Source: ipv6SourceOverride ?? settings?.dnsServerIPv6SourceAddresses?.join('\n') ?? '',
      defaultTtl: defaultTtlOverride ?? String(settings?.defaultRecordTtl ?? 3600),
      responsiblePerson: responsiblePersonOverride ?? settings?.defaultResponsiblePerson ?? '',
      useSoaDateScheme: useSoaDateSchemeOverride ?? settings?.useSoaSerialDateScheme ?? false,
      preferIPv6: preferIPv6Override ?? settings?.preferIPv6 ?? false,
      udpPayloadSize: udpPayloadSizeOverride ?? String(settings?.udpPayloadSize ?? 1232),
      zoneTransferNetworks: zoneTransferNetworksOverride ?? settings?.zoneTransferAllowedNetworks?.join('\n') ?? '',
      notifyNetworks: notifyNetworksOverride ?? settings?.notifyAllowedNetworks?.join('\n') ?? '',
      autoUpdateApps: autoUpdateAppsOverride ?? settings?.dnsAppsEnableAutomaticUpdate ?? true,
    }),
    [
      settings,
      dnsServerDomainOverride,
      localEndPointsOverride,
      ipv4SourceOverride,
      ipv6SourceOverride,
      defaultTtlOverride,
      responsiblePersonOverride,
      useSoaDateSchemeOverride,
      preferIPv6Override,
      udpPayloadSizeOverride,
      zoneTransferNetworksOverride,
      notifyNetworksOverride,
      autoUpdateAppsOverride,
    ]
  );

  const hasChanges =
    dnsServerDomainOverride !== null ||
    localEndPointsOverride !== null ||
    ipv4SourceOverride !== null ||
    ipv6SourceOverride !== null ||
    defaultTtlOverride !== null ||
    responsiblePersonOverride !== null ||
    useSoaDateSchemeOverride !== null ||
    preferIPv6Override !== null ||
    udpPayloadSizeOverride !== null ||
    zoneTransferNetworksOverride !== null ||
    notifyNetworksOverride !== null ||
    autoUpdateAppsOverride !== null;

  const clearOverrides = () => {
    setDnsServerDomainOverride(null);
    setLocalEndPointsOverride(null);
    setIpv4SourceOverride(null);
    setIpv6SourceOverride(null);
    setDefaultTtlOverride(null);
    setResponsiblePersonOverride(null);
    setUseSoaDateSchemeOverride(null);
    setPreferIPv6Override(null);
    setUdpPayloadSizeOverride(null);
    setZoneTransferNetworksOverride(null);
    setNotifyNetworksOverride(null);
    setAutoUpdateAppsOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const parseLines = (text: string) =>
      text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

    const success = await onSave({
      dnsServerDomain: formValues.dnsServerDomain,
      dnsServerLocalEndPoints: parseLines(formValues.localEndPoints),
      dnsServerIPv4SourceAddresses: parseLines(formValues.ipv4Source),
      dnsServerIPv6SourceAddresses: parseLines(formValues.ipv6Source),
      defaultRecordTtl: parseInt(formValues.defaultTtl, 10) || 3600,
      defaultResponsiblePerson: formValues.responsiblePerson || null,
      useSoaSerialDateScheme: formValues.useSoaDateScheme,
      preferIPv6: formValues.preferIPv6,
      udpPayloadSize: parseInt(formValues.udpPayloadSize, 10) || 1232,
      zoneTransferAllowedNetworks: parseLines(formValues.zoneTransferNetworks),
      notifyAllowedNetworks: parseLines(formValues.notifyNetworks),
      dnsAppsEnableAutomaticUpdate: formValues.autoUpdateApps,
    });

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
            <Skeleton className="h-4 w-96" />
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
      {/* Server Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Identity
          </CardTitle>
          <CardDescription>
            Configure the DNS server's identity and listening endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dnsServerDomain">DNS Server Domain</Label>
            <Input
              id="dnsServerDomain"
              value={formValues.dnsServerDomain}
              onChange={(e) => setDnsServerDomainOverride(e.target.value)}
              placeholder="dns.example.com"
            />
            <p className="text-xs text-muted-foreground">
              The primary domain name used to identify this DNS server (used in SOA records)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="localEndPoints">Local End Points</Label>
            <Textarea
              id="localEndPoints"
              value={formValues.localEndPoints}
              onChange={(e) => setLocalEndPointsOverride(e.target.value)}
              placeholder="0.0.0.0:53&#10;[::]:53"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Network interface addresses and ports to listen on (one per line, format: IP:port)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ipv4Source">IPv4 Source Addresses</Label>
              <Textarea
                id="ipv4Source"
                value={formValues.ipv4Source}
                onChange={(e) => setIpv4SourceOverride(e.target.value)}
                placeholder="0.0.0.0"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Source addresses for outbound IPv4 queries
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ipv6Source">IPv6 Source Addresses</Label>
              <Textarea
                id="ipv6Source"
                value={formValues.ipv6Source}
                onChange={(e) => setIpv6SourceOverride(e.target.value)}
                placeholder="::"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Source addresses for outbound IPv6 queries
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="preferIPv6">Prefer IPv6</Label>
              <p className="text-xs text-muted-foreground">
                Use IPv6 for outbound queries when available
              </p>
            </div>
            <Switch
              id="preferIPv6"
              checked={formValues.preferIPv6}
              onCheckedChange={(checked) => setPreferIPv6Override(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Record Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Record Settings</CardTitle>
          <CardDescription>
            Default values for new DNS records and zones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultTtl">Default Record TTL (seconds)</Label>
              <Input
                id="defaultTtl"
                type="number"
                min={0}
                value={formValues.defaultTtl}
                onChange={(e) => setDefaultTtlOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsiblePerson">Default Responsible Person</Label>
              <Input
                id="responsiblePerson"
                value={formValues.responsiblePerson}
                onChange={(e) => setResponsiblePersonOverride(e.target.value)}
                placeholder="admin.example.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="useSoaDateScheme">Use SOA Serial Date Scheme</Label>
              <p className="text-xs text-muted-foreground">
                Use date-based serial numbers for SOA records (YYYYMMDDnn)
              </p>
            </div>
            <Switch
              id="useSoaDateScheme"
              checked={formValues.useSoaDateScheme}
              onCheckedChange={(checked) => setUseSoaDateSchemeOverride(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Zone Transfer & EDNS Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Transfer & Network Settings</CardTitle>
          <CardDescription>
            Configure zone transfer permissions and EDNS settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zoneTransferNetworks">Zone Transfer Allowed Networks</Label>
            <Textarea
              id="zoneTransferNetworks"
              value={formValues.zoneTransferNetworks}
              onChange={(e) => setZoneTransferNetworksOverride(e.target.value)}
              placeholder="192.168.1.0/24&#10;10.0.0.0/8"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Networks allowed to perform zone transfers without TSIG (one per line)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notifyNetworks">Notify Allowed Networks</Label>
            <Textarea
              id="notifyNetworks"
              value={formValues.notifyNetworks}
              onChange={(e) => setNotifyNetworksOverride(e.target.value)}
              placeholder="192.168.1.0/24"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Networks allowed to send NOTIFY messages to secondary zones
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="udpPayloadSize">UDP Payload Size (bytes)</Label>
            <Input
              id="udpPayloadSize"
              type="number"
              min={512}
              max={4096}
              className="w-32"
              value={formValues.udpPayloadSize}
              onChange={(e) => setUdpPayloadSizeOverride(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Maximum EDNS UDP payload size (512-4096, default: 1232)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoUpdateApps">Auto-Update DNS Apps</Label>
              <p className="text-xs text-muted-foreground">
                Automatically update DNS apps from the App Store
              </p>
            </div>
            <Switch
              id="autoUpdateApps"
              checked={formValues.autoUpdateApps}
              onCheckedChange={(checked) => setAutoUpdateAppsOverride(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
