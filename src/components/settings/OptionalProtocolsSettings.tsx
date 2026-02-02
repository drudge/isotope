import { useState, useMemo } from 'react';
import { Network } from 'lucide-react';
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

interface OptionalProtocolsSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

export default function OptionalProtocolsSettings({
  settings,
  isLoading,
  onSave,
}: OptionalProtocolsSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Override states for each protocol
  const [enableDoTOverride, setEnableDoTOverride] = useState<boolean | null>(null);
  const [enableDoHOverride, setEnableDoHOverride] = useState<boolean | null>(null);
  const [enableDoH3Override, setEnableDoH3Override] = useState<boolean | null>(null);
  const [enableDoQOverride, setEnableDoQOverride] = useState<boolean | null>(null);
  const [enableDnsOverHttpOverride, setEnableDnsOverHttpOverride] = useState<boolean | null>(null);
  const [enableUdpProxyOverride, setEnableUdpProxyOverride] = useState<boolean | null>(null);
  const [enableTcpProxyOverride, setEnableTcpProxyOverride] = useState<boolean | null>(null);

  // Port overrides
  const [doTPortOverride, setDoTPortOverride] = useState<string | null>(null);
  const [doHPortOverride, setDoHPortOverride] = useState<string | null>(null);
  const [doQPortOverride, setDoQPortOverride] = useState<string | null>(null);
  const [dnsOverHttpPortOverride, setDnsOverHttpPortOverride] = useState<string | null>(null);
  const [udpProxyPortOverride, setUdpProxyPortOverride] = useState<string | null>(null);
  const [tcpProxyPortOverride, setTcpProxyPortOverride] = useState<string | null>(null);

  // Certificate & other overrides
  const [dnsTlsCertPathOverride, setDnsTlsCertPathOverride] = useState<string | null>(null);
  const [dnsTlsCertPasswordOverride, setDnsTlsCertPasswordOverride] = useState<string | null>(null);
  const [reverseProxyAclOverride, setReverseProxyAclOverride] = useState<string | null>(null);
  const [dnsOverHttpRealIpHeaderOverride, setDnsOverHttpRealIpHeaderOverride] = useState<string | null>(null);

  const formValues = useMemo(
    () => ({
      enableDoT: enableDoTOverride ?? settings?.enableDnsOverTls ?? false,
      enableDoH: enableDoHOverride ?? settings?.enableDnsOverHttps ?? false,
      enableDoH3: enableDoH3Override ?? settings?.enableDnsOverHttp3 ?? false,
      enableDoQ: enableDoQOverride ?? settings?.enableDnsOverQuic ?? false,
      enableDnsOverHttp: enableDnsOverHttpOverride ?? settings?.enableDnsOverHttp ?? false,
      enableUdpProxy: enableUdpProxyOverride ?? settings?.enableDnsOverUdpProxy ?? false,
      enableTcpProxy: enableTcpProxyOverride ?? settings?.enableDnsOverTcpProxy ?? false,
      doTPort: doTPortOverride ?? String(settings?.dnsOverTlsPort ?? 853),
      doHPort: doHPortOverride ?? String(settings?.dnsOverHttpsPort ?? 443),
      doQPort: doQPortOverride ?? String(settings?.dnsOverQuicPort ?? 853),
      dnsOverHttpPort: dnsOverHttpPortOverride ?? String(settings?.dnsOverHttpPort ?? 80),
      udpProxyPort: udpProxyPortOverride ?? String(settings?.dnsOverUdpProxyPort ?? 538),
      tcpProxyPort: tcpProxyPortOverride ?? String(settings?.dnsOverTcpProxyPort ?? 538),
      dnsTlsCertPath: dnsTlsCertPathOverride ?? settings?.dnsTlsCertificatePath ?? '',
      dnsTlsCertPassword: dnsTlsCertPasswordOverride ?? '',
      reverseProxyAcl: reverseProxyAclOverride ?? settings?.reverseProxyNetworkACL?.join('\n') ?? '',
      dnsOverHttpRealIpHeader: dnsOverHttpRealIpHeaderOverride ?? settings?.dnsOverHttpRealIpHeader ?? 'X-Real-IP',
    }),
    [
      settings,
      enableDoTOverride,
      enableDoHOverride,
      enableDoH3Override,
      enableDoQOverride,
      enableDnsOverHttpOverride,
      enableUdpProxyOverride,
      enableTcpProxyOverride,
      doTPortOverride,
      doHPortOverride,
      doQPortOverride,
      dnsOverHttpPortOverride,
      udpProxyPortOverride,
      tcpProxyPortOverride,
      dnsTlsCertPathOverride,
      dnsTlsCertPasswordOverride,
      reverseProxyAclOverride,
      dnsOverHttpRealIpHeaderOverride,
    ]
  );

  const hasChanges =
    enableDoTOverride !== null ||
    enableDoHOverride !== null ||
    enableDoH3Override !== null ||
    enableDoQOverride !== null ||
    enableDnsOverHttpOverride !== null ||
    enableUdpProxyOverride !== null ||
    enableTcpProxyOverride !== null ||
    doTPortOverride !== null ||
    doHPortOverride !== null ||
    doQPortOverride !== null ||
    dnsOverHttpPortOverride !== null ||
    udpProxyPortOverride !== null ||
    tcpProxyPortOverride !== null ||
    dnsTlsCertPathOverride !== null ||
    dnsTlsCertPasswordOverride !== null ||
    reverseProxyAclOverride !== null ||
    dnsOverHttpRealIpHeaderOverride !== null;

  const clearOverrides = () => {
    setEnableDoTOverride(null);
    setEnableDoHOverride(null);
    setEnableDoH3Override(null);
    setEnableDoQOverride(null);
    setEnableDnsOverHttpOverride(null);
    setEnableUdpProxyOverride(null);
    setEnableTcpProxyOverride(null);
    setDoTPortOverride(null);
    setDoHPortOverride(null);
    setDoQPortOverride(null);
    setDnsOverHttpPortOverride(null);
    setUdpProxyPortOverride(null);
    setTcpProxyPortOverride(null);
    setDnsTlsCertPathOverride(null);
    setDnsTlsCertPasswordOverride(null);
    setReverseProxyAclOverride(null);
    setDnsOverHttpRealIpHeaderOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const updates: DnsSettingsUpdate = {
      enableDnsOverTls: formValues.enableDoT,
      enableDnsOverHttps: formValues.enableDoH,
      enableDnsOverHttp3: formValues.enableDoH3,
      enableDnsOverQuic: formValues.enableDoQ,
      enableDnsOverHttp: formValues.enableDnsOverHttp,
      enableDnsOverUdpProxy: formValues.enableUdpProxy,
      enableDnsOverTcpProxy: formValues.enableTcpProxy,
      dnsOverTlsPort: parseInt(formValues.doTPort, 10) || 853,
      dnsOverHttpsPort: parseInt(formValues.doHPort, 10) || 443,
      dnsOverQuicPort: parseInt(formValues.doQPort, 10) || 853,
      dnsOverHttpPort: parseInt(formValues.dnsOverHttpPort, 10) || 80,
      dnsOverUdpProxyPort: parseInt(formValues.udpProxyPort, 10) || 538,
      dnsOverTcpProxyPort: parseInt(formValues.tcpProxyPort, 10) || 538,
      reverseProxyNetworkACL: formValues.reverseProxyAcl
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      dnsOverHttpRealIpHeader: formValues.dnsOverHttpRealIpHeader,
    };

    if (dnsTlsCertPathOverride !== null) {
      updates.dnsTlsCertificatePath = formValues.dnsTlsCertPath || null;
    }
    if (dnsTlsCertPasswordOverride !== null && formValues.dnsTlsCertPassword) {
      updates.dnsTlsCertificatePassword = formValues.dnsTlsCertPassword;
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
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Secure DNS Protocols */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Secure DNS Protocols
          </CardTitle>
          <CardDescription>
            Enable encrypted DNS protocols for enhanced privacy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DNS-over-TLS */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableDoT" className="font-medium">DNS-over-TLS (DoT)</Label>
                  <p className="text-xs text-muted-foreground">Port 853</p>
                </div>
                <Switch
                  id="enableDoT"
                  checked={formValues.enableDoT}
                  onCheckedChange={(checked) => setEnableDoTOverride(checked)}
                />
              </div>
              {formValues.enableDoT && (
                <div className="space-y-1">
                  <Label htmlFor="doTPort" className="text-xs">Port</Label>
                  <Input
                    id="doTPort"
                    type="number"
                    value={formValues.doTPort}
                    onChange={(e) => setDoTPortOverride(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
            </div>

            {/* DNS-over-HTTPS */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableDoH" className="font-medium">DNS-over-HTTPS (DoH)</Label>
                  <p className="text-xs text-muted-foreground">Port 443</p>
                </div>
                <Switch
                  id="enableDoH"
                  checked={formValues.enableDoH}
                  onCheckedChange={(checked) => setEnableDoHOverride(checked)}
                />
              </div>
              {formValues.enableDoH && (
                <div className="space-y-1">
                  <Label htmlFor="doHPort" className="text-xs">Port</Label>
                  <Input
                    id="doHPort"
                    type="number"
                    value={formValues.doHPort}
                    onChange={(e) => setDoHPortOverride(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
            </div>

            {/* DNS-over-HTTP/3 */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableDoH3" className="font-medium">DNS-over-HTTP/3</Label>
                  <p className="text-xs text-muted-foreground">QUIC-based DoH</p>
                </div>
                <Switch
                  id="enableDoH3"
                  checked={formValues.enableDoH3}
                  onCheckedChange={(checked) => setEnableDoH3Override(checked)}
                />
              </div>
            </div>

            {/* DNS-over-QUIC */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableDoQ" className="font-medium">DNS-over-QUIC (DoQ)</Label>
                  <p className="text-xs text-muted-foreground">Port 853 (UDP)</p>
                </div>
                <Switch
                  id="enableDoQ"
                  checked={formValues.enableDoQ}
                  onCheckedChange={(checked) => setEnableDoQOverride(checked)}
                />
              </div>
              {formValues.enableDoQ && (
                <div className="space-y-1">
                  <Label htmlFor="doQPort" className="text-xs">Port</Label>
                  <Input
                    id="doQPort"
                    type="number"
                    value={formValues.doQPort}
                    onChange={(e) => setDoQPortOverride(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proxy Protocols */}
      <Card>
        <CardHeader>
          <CardTitle>Proxy Protocols</CardTitle>
          <CardDescription>
            Enable proxy protocols for use with reverse proxies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* DNS-over-HTTP (for reverse proxy) */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableDnsOverHttp" className="font-medium">DNS-over-HTTP</Label>
                  <p className="text-xs text-muted-foreground">For reverse proxy</p>
                </div>
                <Switch
                  id="enableDnsOverHttp"
                  checked={formValues.enableDnsOverHttp}
                  onCheckedChange={(checked) => setEnableDnsOverHttpOverride(checked)}
                />
              </div>
              {formValues.enableDnsOverHttp && (
                <div className="space-y-1">
                  <Label htmlFor="dnsOverHttpPort" className="text-xs">Port</Label>
                  <Input
                    id="dnsOverHttpPort"
                    type="number"
                    value={formValues.dnsOverHttpPort}
                    onChange={(e) => setDnsOverHttpPortOverride(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
            </div>

            {/* UDP Proxy */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableUdpProxy" className="font-medium">UDP Proxy</Label>
                  <p className="text-xs text-muted-foreground">PROXY protocol</p>
                </div>
                <Switch
                  id="enableUdpProxy"
                  checked={formValues.enableUdpProxy}
                  onCheckedChange={(checked) => setEnableUdpProxyOverride(checked)}
                />
              </div>
              {formValues.enableUdpProxy && (
                <div className="space-y-1">
                  <Label htmlFor="udpProxyPort" className="text-xs">Port</Label>
                  <Input
                    id="udpProxyPort"
                    type="number"
                    value={formValues.udpProxyPort}
                    onChange={(e) => setUdpProxyPortOverride(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
            </div>

            {/* TCP Proxy */}
            <div className="p-4 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableTcpProxy" className="font-medium">TCP Proxy</Label>
                  <p className="text-xs text-muted-foreground">PROXY protocol</p>
                </div>
                <Switch
                  id="enableTcpProxy"
                  checked={formValues.enableTcpProxy}
                  onCheckedChange={(checked) => setEnableTcpProxyOverride(checked)}
                />
              </div>
              {formValues.enableTcpProxy && (
                <div className="space-y-1">
                  <Label htmlFor="tcpProxyPort" className="text-xs">Port</Label>
                  <Input
                    id="tcpProxyPort"
                    type="number"
                    value={formValues.tcpProxyPort}
                    onChange={(e) => setTcpProxyPortOverride(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reverseProxyAcl">Reverse Proxy Network ACL</Label>
            <Textarea
              id="reverseProxyAcl"
              value={formValues.reverseProxyAcl}
              onChange={(e) => setReverseProxyAclOverride(e.target.value)}
              placeholder="192.168.1.0/24&#10;10.0.0.0/8"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Networks allowed to connect via proxy protocols (one per line)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dnsOverHttpRealIpHeader">DNS-over-HTTP Real IP Header</Label>
            <Input
              id="dnsOverHttpRealIpHeader"
              value={formValues.dnsOverHttpRealIpHeader}
              onChange={(e) => setDnsOverHttpRealIpHeaderOverride(e.target.value)}
              placeholder="X-Real-IP"
            />
          </div>
        </CardContent>
      </Card>

      {/* TLS Certificate */}
      <Card>
        <CardHeader>
          <CardTitle>DNS TLS Certificate</CardTitle>
          <CardDescription>
            Certificate for DNS-over-TLS and DNS-over-HTTPS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dnsTlsCertPath">Certificate Path</Label>
            <Input
              id="dnsTlsCertPath"
              value={formValues.dnsTlsCertPath}
              onChange={(e) => setDnsTlsCertPathOverride(e.target.value)}
              placeholder="/path/to/certificate.pfx"
            />
            <p className="text-xs text-muted-foreground">
              Path to PKCS#12 (.pfx) certificate file for DoT/DoH
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dnsTlsCertPassword">Certificate Password</Label>
            <Input
              id="dnsTlsCertPassword"
              type="password"
              value={formValues.dnsTlsCertPassword}
              onChange={(e) => setDnsTlsCertPasswordOverride(e.target.value)}
              placeholder="Enter password if required"
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
