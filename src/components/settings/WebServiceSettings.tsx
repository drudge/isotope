import { useState, useMemo } from 'react';
import { Save, Globe } from 'lucide-react';
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

interface WebServiceSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

export default function WebServiceSettings({
  settings,
  isLoading,
  onSave,
}: WebServiceSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Override states
  const [localAddressesOverride, setLocalAddressesOverride] = useState<string | null>(null);
  const [httpPortOverride, setHttpPortOverride] = useState<string | null>(null);
  const [enableTlsOverride, setEnableTlsOverride] = useState<boolean | null>(null);
  const [tlsPortOverride, setTlsPortOverride] = useState<string | null>(null);
  const [enableHttp3Override, setEnableHttp3Override] = useState<boolean | null>(null);
  const [httpToTlsRedirectOverride, setHttpToTlsRedirectOverride] = useState<boolean | null>(null);
  const [useSelfSignedCertOverride, setUseSelfSignedCertOverride] = useState<boolean | null>(null);
  const [tlsCertPathOverride, setTlsCertPathOverride] = useState<string | null>(null);
  const [tlsCertPasswordOverride, setTlsCertPasswordOverride] = useState<string | null>(null);
  const [realIpHeaderOverride, setRealIpHeaderOverride] = useState<string | null>(null);

  const formValues = useMemo(
    () => ({
      localAddresses: localAddressesOverride ?? settings?.webServiceLocalAddresses?.join('\n') ?? '',
      httpPort: httpPortOverride ?? String(settings?.webServiceHttpPort ?? 5380),
      enableTls: enableTlsOverride ?? settings?.webServiceEnableTls ?? false,
      tlsPort: tlsPortOverride ?? String(settings?.webServiceTlsPort ?? 53443),
      enableHttp3: enableHttp3Override ?? settings?.webServiceEnableHttp3 ?? false,
      httpToTlsRedirect: httpToTlsRedirectOverride ?? settings?.webServiceHttpToTlsRedirect ?? false,
      useSelfSignedCert: useSelfSignedCertOverride ?? settings?.webServiceUseSelfSignedTlsCertificate ?? true,
      tlsCertPath: tlsCertPathOverride ?? settings?.webServiceTlsCertificatePath ?? '',
      tlsCertPassword: tlsCertPasswordOverride ?? '',
      realIpHeader: realIpHeaderOverride ?? settings?.webServiceRealIpHeader ?? 'X-Real-IP',
    }),
    [
      settings,
      localAddressesOverride,
      httpPortOverride,
      enableTlsOverride,
      tlsPortOverride,
      enableHttp3Override,
      httpToTlsRedirectOverride,
      useSelfSignedCertOverride,
      tlsCertPathOverride,
      tlsCertPasswordOverride,
      realIpHeaderOverride,
    ]
  );

  const hasChanges =
    localAddressesOverride !== null ||
    httpPortOverride !== null ||
    enableTlsOverride !== null ||
    tlsPortOverride !== null ||
    enableHttp3Override !== null ||
    httpToTlsRedirectOverride !== null ||
    useSelfSignedCertOverride !== null ||
    tlsCertPathOverride !== null ||
    tlsCertPasswordOverride !== null ||
    realIpHeaderOverride !== null;

  const clearOverrides = () => {
    setLocalAddressesOverride(null);
    setHttpPortOverride(null);
    setEnableTlsOverride(null);
    setTlsPortOverride(null);
    setEnableHttp3Override(null);
    setHttpToTlsRedirectOverride(null);
    setUseSelfSignedCertOverride(null);
    setTlsCertPathOverride(null);
    setTlsCertPasswordOverride(null);
    setRealIpHeaderOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const updates: DnsSettingsUpdate = {
      webServiceLocalAddresses: formValues.localAddresses
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      webServiceHttpPort: parseInt(formValues.httpPort, 10) || 5380,
      webServiceEnableTls: formValues.enableTls,
      webServiceTlsPort: parseInt(formValues.tlsPort, 10) || 53443,
      webServiceEnableHttp3: formValues.enableHttp3,
      webServiceHttpToTlsRedirect: formValues.httpToTlsRedirect,
      webServiceUseSelfSignedTlsCertificate: formValues.useSelfSignedCert,
      webServiceRealIpHeader: formValues.realIpHeader,
    };

    if (tlsCertPathOverride !== null) {
      updates.webServiceTlsCertificatePath = formValues.tlsCertPath || null;
    }
    if (tlsCertPasswordOverride !== null && formValues.tlsCertPassword) {
      updates.webServiceTlsCertificatePassword = formValues.tlsCertPassword;
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
            <Skeleton className="h-4 w-96" />
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
      {/* HTTP Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web Service Settings
          </CardTitle>
          <CardDescription>
            Configure the web interface and API service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="localAddresses">Listen Addresses</Label>
            <Textarea
              id="localAddresses"
              value={formValues.localAddresses}
              onChange={(e) => setLocalAddressesOverride(e.target.value)}
              placeholder="0.0.0.0&#10;[::]"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Network interface addresses to listen on (one per line)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="httpPort">HTTP Port</Label>
              <Input
                id="httpPort"
                type="number"
                value={formValues.httpPort}
                onChange={(e) => setHttpPortOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tlsPort">HTTPS Port</Label>
              <Input
                id="tlsPort"
                type="number"
                value={formValues.tlsPort}
                onChange={(e) => setTlsPortOverride(e.target.value)}
                disabled={!formValues.enableTls}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="realIpHeader">Real IP Header</Label>
            <Input
              id="realIpHeader"
              value={formValues.realIpHeader}
              onChange={(e) => setRealIpHeaderOverride(e.target.value)}
              placeholder="X-Real-IP"
            />
            <p className="text-xs text-muted-foreground">
              HTTP header for client IP when behind a reverse proxy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* TLS Settings */}
      <Card>
        <CardHeader>
          <CardTitle>TLS / HTTPS Settings</CardTitle>
          <CardDescription>
            Configure HTTPS for secure web access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableTls">Enable HTTPS</Label>
              <p className="text-xs text-muted-foreground">
                Enable TLS/HTTPS for the web service
              </p>
            </div>
            <Switch
              id="enableTls"
              checked={formValues.enableTls}
              onCheckedChange={(checked) => setEnableTlsOverride(checked)}
            />
          </div>

          {formValues.enableTls && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableHttp3">Enable HTTP/3</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable HTTP/3 (QUIC) protocol support
                  </p>
                </div>
                <Switch
                  id="enableHttp3"
                  checked={formValues.enableHttp3}
                  onCheckedChange={(checked) => setEnableHttp3Override(checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="httpToTlsRedirect">HTTP to HTTPS Redirect</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically redirect HTTP requests to HTTPS
                  </p>
                </div>
                <Switch
                  id="httpToTlsRedirect"
                  checked={formValues.httpToTlsRedirect}
                  onCheckedChange={(checked) => setHttpToTlsRedirectOverride(checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useSelfSignedCert">Use Self-Signed Certificate</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate and use a self-signed certificate
                  </p>
                </div>
                <Switch
                  id="useSelfSignedCert"
                  checked={formValues.useSelfSignedCert}
                  onCheckedChange={(checked) => setUseSelfSignedCertOverride(checked)}
                />
              </div>

              {!formValues.useSelfSignedCert && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="tlsCertPath">TLS Certificate Path</Label>
                    <Input
                      id="tlsCertPath"
                      value={formValues.tlsCertPath}
                      onChange={(e) => setTlsCertPathOverride(e.target.value)}
                      placeholder="/path/to/certificate.pfx"
                    />
                    <p className="text-xs text-muted-foreground">
                      Path to PKCS#12 (.pfx) certificate file on the server
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tlsCertPassword">Certificate Password</Label>
                    <Input
                      id="tlsCertPassword"
                      type="password"
                      value={formValues.tlsCertPassword}
                      onChange={(e) => setTlsCertPasswordOverride(e.target.value)}
                      placeholder="Enter password if required"
                    />
                  </div>
                </>
              )}
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
