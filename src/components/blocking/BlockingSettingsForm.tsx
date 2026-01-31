import { useState, useMemo } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { BlockingSettings, BlockingType } from '@/types/api';

interface BlockingSettingsFormProps {
  settings: BlockingSettings | null;
  isLoading: boolean;
  onSave: (settings: {
    blockingType: BlockingType;
    blockingAnswerTtl: number;
    customBlockingAddresses: string[];
    blockingBypassList: string[];
    allowTxtBlockingReport: boolean;
  }) => Promise<void>;
}

interface FormState {
  blockingType: BlockingType;
  ttl: string;
  customAddresses: string;
  bypassList: string;
  allowTxtReport: boolean;
}

export function BlockingSettingsForm({
  settings,
  isLoading,
  onSave,
}: BlockingSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Local overrides - only tracks fields that have been changed from settings
  const [blockingTypeOverride, setBlockingTypeOverride] = useState<BlockingType | null>(null);
  const [ttlOverride, setTtlOverride] = useState<string | null>(null);
  const [customAddressesOverride, setCustomAddressesOverride] = useState<string | null>(null);
  const [bypassListOverride, setBypassListOverride] = useState<string | null>(null);
  const [allowTxtReportOverride, setAllowTxtReportOverride] = useState<boolean | null>(null);

  // Compute current form values from settings + local overrides
  const formValues = useMemo((): FormState => ({
    blockingType: blockingTypeOverride ?? settings?.blockingType ?? 'AnyAddress',
    ttl: ttlOverride ?? String(settings?.blockingAnswerTtl ?? 30),
    customAddresses: customAddressesOverride ?? settings?.customBlockingAddresses?.join('\n') ?? '',
    bypassList: bypassListOverride ?? settings?.blockingBypassList?.join('\n') ?? '',
    allowTxtReport: allowTxtReportOverride ?? settings?.allowTxtBlockingReport ?? true,
  }), [settings, blockingTypeOverride, ttlOverride, customAddressesOverride, bypassListOverride, allowTxtReportOverride]);

  const hasChanges = blockingTypeOverride !== null ||
    ttlOverride !== null ||
    customAddressesOverride !== null ||
    bypassListOverride !== null ||
    allowTxtReportOverride !== null;

  const clearOverrides = () => {
    setBlockingTypeOverride(null);
    setTtlOverride(null);
    setCustomAddressesOverride(null);
    setBypassListOverride(null);
    setAllowTxtReportOverride(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      blockingType: formValues.blockingType,
      blockingAnswerTtl: parseInt(formValues.ttl, 10) || 30,
      customBlockingAddresses: formValues.customAddresses
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      blockingBypassList: formValues.bypassList
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      allowTxtBlockingReport: formValues.allowTxtReport,
    });
    setIsSaving(false);
    clearOverrides();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Blocking Response</CardTitle>
          <CardDescription>
            Configure how the DNS server responds to blocked domain requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Response Type</Label>
            <RadioGroup
              value={formValues.blockingType}
              onValueChange={(value) => setBlockingTypeOverride(value as BlockingType)}
              className="space-y-2"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="AnyAddress" id="any-address" className="mt-1" />
                <div>
                  <Label htmlFor="any-address" className="font-normal cursor-pointer">
                    Any Address
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Respond with 0.0.0.0 and :: for blocked domains
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="NxDomain" id="nxdomain" className="mt-1" />
                <div>
                  <Label htmlFor="nxdomain" className="font-normal cursor-pointer">
                    NX Domain
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Respond with NXDOMAIN (domain does not exist)
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="CustomAddress" id="custom-address" className="mt-1" />
                <div>
                  <Label htmlFor="custom-address" className="font-normal cursor-pointer">
                    Custom Address
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Respond with custom IP addresses specified below
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {formValues.blockingType === 'CustomAddress' && (
            <div className="space-y-2">
              <Label htmlFor="custom-addresses">Custom Blocking Addresses</Label>
              <Textarea
                id="custom-addresses"
                placeholder="127.0.0.1&#10;::1"
                value={formValues.customAddresses}
                onChange={(e) => setCustomAddressesOverride(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Enter one IP address per line. Both IPv4 and IPv6 are supported.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ttl">Response TTL (seconds)</Label>
            <Input
              id="ttl"
              type="number"
              min={0}
              className="w-32"
              value={formValues.ttl}
              onChange={(e) => setTtlOverride(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              How long clients should cache the blocking response
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bypass List</CardTitle>
          <CardDescription>
            IP addresses and networks that can bypass DNS blocking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="192.168.1.100&#10;10.0.0.0/8"
            value={formValues.bypassList}
            onChange={(e) => setBypassListOverride(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Enter one IP address or CIDR network per line. Queries from these addresses will not be
            blocked.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="txt-report"
              checked={formValues.allowTxtReport}
              onCheckedChange={(checked) => setAllowTxtReportOverride(checked === true)}
            />
            <div>
              <Label htmlFor="txt-report" className="cursor-pointer">
                Allow TXT Blocking Report
              </Label>
              <p className="text-sm text-muted-foreground">
                Respond with TXT records containing blocking information for TXT queries
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
