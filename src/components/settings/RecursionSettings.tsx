import { useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DnsSettings, DnsSettingsUpdate, RecursionMode } from '@/types/settings';

interface RecursionSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

export default function RecursionSettings({
  settings,
  isLoading,
  onSave,
}: RecursionSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Override states
  const [recursionOverride, setRecursionOverride] = useState<RecursionMode | null>(null);
  const [recursionAclOverride, setRecursionAclOverride] = useState<string | null>(null);
  const [randomizeNameOverride, setRandomizeNameOverride] = useState<boolean | null>(null);
  const [qnameMinOverride, setQnameMinOverride] = useState<boolean | null>(null);
  const [dnssecValidationOverride, setDnssecValidationOverride] = useState<boolean | null>(null);
  const [ednsClientSubnetOverride, setEdnsClientSubnetOverride] = useState<boolean | null>(null);
  const [ednsIPv4PrefixOverride, setEdnsIPv4PrefixOverride] = useState<string | null>(null);
  const [ednsIPv6PrefixOverride, setEdnsIPv6PrefixOverride] = useState<string | null>(null);
  const [ednsIPv4OverrideAddrOverride, setEdnsIPv4OverrideAddrOverride] = useState<string | null>(null);
  const [ednsIPv6OverrideAddrOverride, setEdnsIPv6OverrideAddrOverride] = useState<string | null>(null);
  const [resolverRetriesOverride, setResolverRetriesOverride] = useState<string | null>(null);
  const [resolverTimeoutOverride, setResolverTimeoutOverride] = useState<string | null>(null);
  const [resolverConcurrencyOverride, setResolverConcurrencyOverride] = useState<string | null>(null);
  const [resolverMaxStackOverride, setResolverMaxStackOverride] = useState<string | null>(null);

  const formValues = useMemo(
    () => ({
      recursion: recursionOverride ?? settings?.recursion ?? 'AllowOnlyForPrivateNetworks',
      recursionAcl: recursionAclOverride ?? settings?.recursionNetworkACL?.join('\n') ?? '',
      randomizeName: randomizeNameOverride ?? settings?.randomizeName ?? true,
      qnameMin: qnameMinOverride ?? settings?.qnameMinimization ?? true,
      dnssecValidation: dnssecValidationOverride ?? settings?.dnssecValidation ?? true,
      ednsClientSubnet: ednsClientSubnetOverride ?? settings?.eDnsClientSubnet ?? false,
      ednsIPv4Prefix: ednsIPv4PrefixOverride ?? String(settings?.eDnsClientSubnetIPv4PrefixLength ?? 24),
      ednsIPv6Prefix: ednsIPv6PrefixOverride ?? String(settings?.eDnsClientSubnetIPv6PrefixLength ?? 56),
      ednsIPv4OverrideAddr: ednsIPv4OverrideAddrOverride ?? settings?.eDnsClientSubnetIpv4Override ?? '',
      ednsIPv6OverrideAddr: ednsIPv6OverrideAddrOverride ?? settings?.eDnsClientSubnetIpv6Override ?? '',
      resolverRetries: resolverRetriesOverride ?? String(settings?.resolverRetries ?? 2),
      resolverTimeout: resolverTimeoutOverride ?? String(settings?.resolverTimeout ?? 1500),
      resolverConcurrency: resolverConcurrencyOverride ?? String(settings?.resolverConcurrency ?? 2),
      resolverMaxStack: resolverMaxStackOverride ?? String(settings?.resolverMaxStackCount ?? 16),
    }),
    [
      settings,
      recursionOverride,
      recursionAclOverride,
      randomizeNameOverride,
      qnameMinOverride,
      dnssecValidationOverride,
      ednsClientSubnetOverride,
      ednsIPv4PrefixOverride,
      ednsIPv6PrefixOverride,
      ednsIPv4OverrideAddrOverride,
      ednsIPv6OverrideAddrOverride,
      resolverRetriesOverride,
      resolverTimeoutOverride,
      resolverConcurrencyOverride,
      resolverMaxStackOverride,
    ]
  );

  const hasChanges =
    recursionOverride !== null ||
    recursionAclOverride !== null ||
    randomizeNameOverride !== null ||
    qnameMinOverride !== null ||
    dnssecValidationOverride !== null ||
    ednsClientSubnetOverride !== null ||
    ednsIPv4PrefixOverride !== null ||
    ednsIPv6PrefixOverride !== null ||
    ednsIPv4OverrideAddrOverride !== null ||
    ednsIPv6OverrideAddrOverride !== null ||
    resolverRetriesOverride !== null ||
    resolverTimeoutOverride !== null ||
    resolverConcurrencyOverride !== null ||
    resolverMaxStackOverride !== null;

  const clearOverrides = () => {
    setRecursionOverride(null);
    setRecursionAclOverride(null);
    setRandomizeNameOverride(null);
    setQnameMinOverride(null);
    setDnssecValidationOverride(null);
    setEdnsClientSubnetOverride(null);
    setEdnsIPv4PrefixOverride(null);
    setEdnsIPv6PrefixOverride(null);
    setEdnsIPv4OverrideAddrOverride(null);
    setEdnsIPv6OverrideAddrOverride(null);
    setResolverRetriesOverride(null);
    setResolverTimeoutOverride(null);
    setResolverConcurrencyOverride(null);
    setResolverMaxStackOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const success = await onSave({
      recursion: formValues.recursion,
      recursionNetworkACL: formValues.recursionAcl
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      randomizeName: formValues.randomizeName,
      qnameMinimization: formValues.qnameMin,
      dnssecValidation: formValues.dnssecValidation,
      eDnsClientSubnet: formValues.ednsClientSubnet,
      eDnsClientSubnetIPv4PrefixLength: parseInt(formValues.ednsIPv4Prefix, 10) || 24,
      eDnsClientSubnetIPv6PrefixLength: parseInt(formValues.ednsIPv6Prefix, 10) || 56,
      eDnsClientSubnetIpv4Override: formValues.ednsIPv4OverrideAddr || null,
      eDnsClientSubnetIpv6Override: formValues.ednsIPv6OverrideAddr || null,
      resolverRetries: parseInt(formValues.resolverRetries, 10) || 2,
      resolverTimeout: parseInt(formValues.resolverTimeout, 10) || 1500,
      resolverConcurrency: parseInt(formValues.resolverConcurrency, 10) || 2,
      resolverMaxStackCount: parseInt(formValues.resolverMaxStack, 10) || 16,
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
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recursion Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recursion Policy
          </CardTitle>
          <CardDescription>
            Control which clients can use recursive DNS resolution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={formValues.recursion}
            onValueChange={(value) => setRecursionOverride(value as RecursionMode)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="Deny" id="deny" className="mt-1" />
              <div>
                <Label htmlFor="deny" className="font-normal cursor-pointer">
                  Deny All
                </Label>
                <p className="text-sm text-muted-foreground">
                  Disable recursive resolution entirely (authoritative-only)
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="Allow" id="allow" className="mt-1" />
              <div>
                <Label htmlFor="allow" className="font-normal cursor-pointer">
                  Allow All
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow recursive resolution for all clients
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="AllowOnlyForPrivateNetworks" id="private" className="mt-1" />
              <div>
                <Label htmlFor="private" className="font-normal cursor-pointer">
                  Allow Only for Private Networks
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow recursive resolution only from private IP ranges (recommended)
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="UseSpecifiedNetworkACL" id="acl" className="mt-1" />
              <div>
                <Label htmlFor="acl" className="font-normal cursor-pointer">
                  Use Specified Network ACL
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow recursive resolution only from specified networks
                </p>
              </div>
            </div>
          </RadioGroup>

          {formValues.recursion === 'UseSpecifiedNetworkACL' && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="recursionAcl">Network ACL</Label>
              <Textarea
                id="recursionAcl"
                value={formValues.recursionAcl}
                onChange={(e) => setRecursionAclOverride(e.target.value)}
                placeholder="192.168.0.0/16&#10;10.0.0.0/8&#10;!192.168.100.0/24"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                One entry per line. Prefix with ! to deny. Order matters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Privacy</CardTitle>
          <CardDescription>
            DNSSEC validation and query privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dnssecValidation">DNSSEC Validation</Label>
              <p className="text-xs text-muted-foreground">
                Validate DNSSEC signatures to protect against DNS spoofing
              </p>
            </div>
            <Switch
              id="dnssecValidation"
              checked={formValues.dnssecValidation}
              onCheckedChange={(checked) => setDnssecValidationOverride(checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="randomizeName">QNAME Randomization</Label>
              <p className="text-xs text-muted-foreground">
                Randomize query name case to protect against cache poisoning
              </p>
            </div>
            <Switch
              id="randomizeName"
              checked={formValues.randomizeName}
              onCheckedChange={(checked) => setRandomizeNameOverride(checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="qnameMin">QNAME Minimization</Label>
              <p className="text-xs text-muted-foreground">
                Send minimal query names to authoritative servers for privacy
              </p>
            </div>
            <Switch
              id="qnameMin"
              checked={formValues.qnameMin}
              onCheckedChange={(checked) => setQnameMinOverride(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* EDNS Client Subnet */}
      <Card>
        <CardHeader>
          <CardTitle>EDNS Client Subnet</CardTitle>
          <CardDescription>
            Send client subnet information to authoritative servers (for CDN optimization)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ednsClientSubnet">Enable EDNS Client Subnet</Label>
              <p className="text-xs text-muted-foreground">
                Include client subnet in queries for geo-aware DNS responses
              </p>
            </div>
            <Switch
              id="ednsClientSubnet"
              checked={formValues.ednsClientSubnet}
              onCheckedChange={(checked) => setEdnsClientSubnetOverride(checked)}
            />
          </div>

          {formValues.ednsClientSubnet && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ednsIPv4Prefix">IPv4 Prefix Length</Label>
                  <Input
                    id="ednsIPv4Prefix"
                    type="number"
                    min={0}
                    max={32}
                    value={formValues.ednsIPv4Prefix}
                    onChange={(e) => setEdnsIPv4PrefixOverride(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ednsIPv6Prefix">IPv6 Prefix Length</Label>
                  <Input
                    id="ednsIPv6Prefix"
                    type="number"
                    min={0}
                    max={128}
                    value={formValues.ednsIPv6Prefix}
                    onChange={(e) => setEdnsIPv6PrefixOverride(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ednsIPv4Override">IPv4 Override Address</Label>
                  <Input
                    id="ednsIPv4Override"
                    value={formValues.ednsIPv4OverrideAddr}
                    onChange={(e) => setEdnsIPv4OverrideAddrOverride(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ednsIPv6Override">IPv6 Override Address</Label>
                  <Input
                    id="ednsIPv6Override"
                    value={formValues.ednsIPv6OverrideAddr}
                    onChange={(e) => setEdnsIPv6OverrideAddrOverride(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resolver Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Resolver Performance</CardTitle>
          <CardDescription>
            Configure recursive resolver behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resolverRetries">Retries</Label>
              <Input
                id="resolverRetries"
                type="number"
                min={0}
                value={formValues.resolverRetries}
                onChange={(e) => setResolverRetriesOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolverTimeout">Timeout (ms)</Label>
              <Input
                id="resolverTimeout"
                type="number"
                min={100}
                value={formValues.resolverTimeout}
                onChange={(e) => setResolverTimeoutOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolverConcurrency">Concurrency</Label>
              <Input
                id="resolverConcurrency"
                type="number"
                min={1}
                value={formValues.resolverConcurrency}
                onChange={(e) => setResolverConcurrencyOverride(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolverMaxStack">Max Stack</Label>
              <Input
                id="resolverMaxStack"
                type="number"
                min={1}
                value={formValues.resolverMaxStack}
                onChange={(e) => setResolverMaxStackOverride(e.target.value)}
              />
            </div>
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
