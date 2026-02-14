import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  Plus,
  Power,
  PowerOff,
  Trash2,
  Settings2,
  RefreshCw,
  ChevronDown,
  Network,
  Layers,
  FileText,
  Lock,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import {
  listDhcpScopes,
  listDhcpLeases,
  getDhcpScope,
  setDhcpScope,
  enableDhcpScope,
  disableDhcpScope,
  deleteDhcpScope,
  removeDhcpLease,
  convertLeaseToReserved,
  convertLeaseToDynamic,
  type DhcpScopeListItem,
  type DhcpScopeDetail,
  type DhcpLease,
  type SetDhcpScopeParams,
} from '@/api/dhcp';
import { toast } from 'sonner';

// --- Helpers ---

function subnetToCidr(mask: string): number {
  return mask
    .split('.')
    .reduce(
      (cidr, octet) =>
        cidr + (parseInt(octet) >>> 0).toString(2).split('1').length - 1,
      0
    );
}

function formatLeaseExpiry(dateStr: string): string {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return 'Expired';
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// --- Default form state ---

const defaultScopeForm: SetDhcpScopeParams = {
  name: '',
  startingAddress: '',
  endingAddress: '',
  subnetMask: '255.255.255.0',
  leaseTimeDays: '1',
  leaseTimeHours: '0',
  leaseTimeMinutes: '0',
  routerAddress: '',
  dnsServers: '',
  domainName: '',
  domainSearchList: '',
  dnsUpdates: '',
  dnsTtl: '',
  useThisDnsServer: '',
  winsServers: '',
  ntpServers: '',
  ntpServerDomainNames: '',
  serverAddress: '',
  serverHostName: '',
  bootFileName: '',
  tftpServerAddresses: '',
  capwapAcIpAddresses: '',
  exclusions: '',
  reservedLeases: '',
  allowOnlyReservedLeases: '',
  offerDelayTime: '',
  pingCheckEnabled: '',
  pingCheckTimeout: '',
  pingCheckRetries: '',
  blockLocallyAdministeredMacAddresses: '',
  ignoreClientIdentifierOption: '',
  vendorInfo: '',
  genericOptions: '',
  staticRoutes: '',
};

// --- Scope Edit Dialog ---

function ScopeEditDialog({
  open,
  onOpenChange,
  editingScope,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingScope: DhcpScopeListItem | null;
  onSaved: () => void;
}) {
  const [scopeForm, setScopeForm] = useState<SetDhcpScopeParams>({ ...defaultScopeForm });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Collapsible states
  const [showDns, setShowDns] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showBoot, setShowBoot] = useState(false);
  const [showExclusions, setShowExclusions] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch full scope details when editing
  const loadScopeDetail = async (name: string) => {
    setLoading(true);
    const response = await getDhcpScope(name);
    if (response.status === 'ok' && response.response) {
      const d = response.response as unknown as DhcpScopeDetail;
      setScopeForm({
        name: d.name,
        startingAddress: d.startingAddress,
        endingAddress: d.endingAddress,
        subnetMask: d.subnetMask,
        leaseTimeDays: String(d.leaseTimeDays ?? 1),
        leaseTimeHours: String(d.leaseTimeHours ?? 0),
        leaseTimeMinutes: String(d.leaseTimeMinutes ?? 0),
        routerAddress: d.routerAddress || '',
        dnsServers: d.dnsServers?.join(', ') || '',
        domainName: d.domainName || '',
        domainSearchList: d.domainSearchList?.join(', ') || '',
        dnsUpdates: d.dnsUpdates ? 'true' : 'false',
        dnsTtl: d.dnsTtl ? String(d.dnsTtl) : '',
        useThisDnsServer: d.useThisDnsServer ? 'true' : 'false',
        winsServers: d.winsServers?.join(', ') || '',
        ntpServers: d.ntpServers?.join(', ') || '',
        ntpServerDomainNames: d.ntpServerDomainNames?.join(', ') || '',
        serverAddress: d.serverAddress || '',
        serverHostName: d.serverHostName || '',
        bootFileName: d.bootFileName || '',
        tftpServerAddresses: d.tftpServerAddresses?.join(', ') || '',
        capwapAcIpAddresses: d.capwapAcIpAddresses?.join(', ') || '',
        exclusions: d.exclusions?.map(e => `${e.startingAddress}|${e.endingAddress}`).join(', ') || '',
        reservedLeases: d.reservedLeases?.map(r => `${r.hostName || ''}|${r.hardwareAddress}|${r.address}|${r.comments || ''}`).join(', ') || '',
        allowOnlyReservedLeases: d.allowOnlyReservedLeases ? 'true' : 'false',
        offerDelayTime: d.offerDelayTime ? String(d.offerDelayTime) : '',
        pingCheckEnabled: d.pingCheckEnabled ? 'true' : 'false',
        pingCheckTimeout: d.pingCheckTimeout ? String(d.pingCheckTimeout) : '',
        pingCheckRetries: d.pingCheckRetries ? String(d.pingCheckRetries) : '',
        blockLocallyAdministeredMacAddresses: d.blockLocallyAdministeredMacAddresses ? 'true' : 'false',
        ignoreClientIdentifierOption: d.ignoreClientIdentifierOption ? 'true' : 'false',
        vendorInfo: d.vendorInfo?.map(v => `${v.identifier}|${v.information}`).join(', ') || '',
        genericOptions: d.genericOptions?.map(g => `${g.code}|${g.value}`).join(', ') || '',
        staticRoutes: d.staticRoutes?.map(r => `${r.destination}|${r.subnetMask}|${r.router}`).join(', ') || '',
      });

      // Auto-open sections with non-default values
      setShowDns(!!(d.domainName || d.dnsServers?.length || d.domainSearchList?.length || d.useThisDnsServer));
      setShowNetwork(!!(d.routerAddress || d.staticRoutes?.length || d.winsServers?.length || d.ntpServers?.length));
      setShowBoot(!!(d.serverAddress || d.serverHostName || d.bootFileName || d.tftpServerAddresses?.length));
      setShowExclusions(!!(d.exclusions?.length || d.reservedLeases?.length || d.allowOnlyReservedLeases));
      setShowAdvanced(!!(d.offerDelayTime || d.pingCheckEnabled || d.blockLocallyAdministeredMacAddresses || d.ignoreClientIdentifierOption || d.vendorInfo?.length || d.genericOptions?.length));
    }
    setLoading(false);
  };

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (editingScope) {
        loadScopeDetail(editingScope.name);
      } else {
        setScopeForm({ ...defaultScopeForm });
        setShowDns(false);
        setShowNetwork(false);
        setShowBoot(false);
        setShowExclusions(false);
        setShowAdvanced(false);
        setLoading(false);
      }
    }
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    if (!scopeForm.name.trim() || !scopeForm.startingAddress.trim() || !scopeForm.endingAddress.trim() || !scopeForm.subnetMask.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    const params: SetDhcpScopeParams = {
      ...scopeForm,
      newName: editingScope && editingScope.name !== scopeForm.name ? scopeForm.name : undefined,
      name: editingScope ? editingScope.name : scopeForm.name,
    };

    // Clean empty strings so they don't get sent as params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ) as SetDhcpScopeParams;

    const response = await setDhcpScope(cleanParams);
    setSaving(false);

    if (response.status === 'ok') {
      toast.success(`Scope ${editingScope ? 'updated' : 'created'} successfully`);
      onSaved();
      onOpenChange(false);
    } else {
      toast.error(response.errorMessage || `Failed to ${editingScope ? 'update' : 'create'} scope`);
    }
  };

  const updateForm = (field: keyof SetDhcpScopeParams, value: string) => {
    setScopeForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{editingScope ? 'Edit Scope' : 'Add Scope'}</DialogTitle>
          <DialogDescription>
            Configure DHCP scope settings for IP address allocation
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <IsotopeSpinner size="md" className="text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Settings (always visible) */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scope-name">Scope Name *</Label>
                  <Input
                    id="scope-name"
                    value={scopeForm.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g., Default"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="starting-address">Starting Address *</Label>
                    <Input
                      id="starting-address"
                      value={scopeForm.startingAddress}
                      onChange={(e) => updateForm('startingAddress', e.target.value)}
                      placeholder="e.g., 192.168.1.100"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ending-address">Ending Address *</Label>
                    <Input
                      id="ending-address"
                      value={scopeForm.endingAddress}
                      onChange={(e) => updateForm('endingAddress', e.target.value)}
                      placeholder="e.g., 192.168.1.200"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subnet-mask">Subnet Mask *</Label>
                  <Input
                    id="subnet-mask"
                    value={scopeForm.subnetMask}
                    onChange={(e) => updateForm('subnetMask', e.target.value)}
                    placeholder="e.g., 255.255.255.0"
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="lease-days">Lease Days</Label>
                    <Input
                      id="lease-days"
                      type="number"
                      min="0"
                      value={scopeForm.leaseTimeDays}
                      onChange={(e) => updateForm('leaseTimeDays', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lease-hours">Hours</Label>
                    <Input
                      id="lease-hours"
                      type="number"
                      min="0"
                      max="23"
                      value={scopeForm.leaseTimeHours}
                      onChange={(e) => updateForm('leaseTimeHours', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lease-minutes">Minutes</Label>
                    <Input
                      id="lease-minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={scopeForm.leaseTimeMinutes}
                      onChange={(e) => updateForm('leaseTimeMinutes', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* DNS Settings */}
              <Collapsible open={showDns} onOpenChange={setShowDns}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showDns ? '' : '-rotate-90'}`} />
                    DNS Settings
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 pl-6 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Domain Name</Label>
                    <Input
                      value={scopeForm.domainName}
                      onChange={(e) => updateForm('domainName', e.target.value)}
                      placeholder="e.g., local"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Domain Search List</Label>
                    <Input
                      value={scopeForm.domainSearchList}
                      onChange={(e) => updateForm('domainSearchList', e.target.value)}
                      placeholder="e.g., home.arpa, lan"
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated list of search domains</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>DNS Updates</Label>
                      <p className="text-xs text-muted-foreground">Auto-update forward and reverse DNS entries</p>
                    </div>
                    <Switch
                      checked={scopeForm.dnsUpdates === 'true'}
                      onCheckedChange={(checked) => updateForm('dnsUpdates', checked ? 'true' : 'false')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DNS TTL</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scopeForm.dnsTtl}
                      onChange={(e) => updateForm('dnsTtl', e.target.value)}
                      placeholder="e.g., 900"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Use This DNS Server</Label>
                      <p className="text-xs text-muted-foreground">Use this server's IP for client DNS config</p>
                    </div>
                    <Switch
                      checked={scopeForm.useThisDnsServer === 'true'}
                      onCheckedChange={(checked) => updateForm('useThisDnsServer', checked ? 'true' : 'false')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DNS Servers</Label>
                    <Input
                      value={scopeForm.dnsServers}
                      onChange={(e) => updateForm('dnsServers', e.target.value)}
                      placeholder="e.g., 8.8.8.8, 8.8.4.4"
                      className="font-mono"
                      disabled={scopeForm.useThisDnsServer === 'true'}
                    />
                    <p className="text-xs text-muted-foreground">Comma-separated. Ignored when "Use This DNS Server" is enabled.</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Network Options */}
              <Collapsible open={showNetwork} onOpenChange={setShowNetwork}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showNetwork ? '' : '-rotate-90'}`} />
                    Network Options
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 pl-6 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Router Address</Label>
                    <Input
                      value={scopeForm.routerAddress}
                      onChange={(e) => updateForm('routerAddress', e.target.value)}
                      placeholder="e.g., 192.168.1.1"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Default gateway for clients (Option 3)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Static Routes</Label>
                    <Input
                      value={scopeForm.staticRoutes}
                      onChange={(e) => updateForm('staticRoutes', e.target.value)}
                      placeholder="destination|mask|router, ..."
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Pipe-separated: destination|subnetMask|router (Option 121)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>WINS Servers</Label>
                    <Input
                      value={scopeForm.winsServers}
                      onChange={(e) => updateForm('winsServers', e.target.value)}
                      placeholder="e.g., 192.168.1.5"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NTP Servers</Label>
                    <Input
                      value={scopeForm.ntpServers}
                      onChange={(e) => updateForm('ntpServers', e.target.value)}
                      placeholder="e.g., 192.168.1.5"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>NTP Server Domain Names</Label>
                    <Input
                      value={scopeForm.ntpServerDomainNames}
                      onChange={(e) => updateForm('ntpServerDomainNames', e.target.value)}
                      placeholder="e.g., pool.ntp.org"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Boot / PXE Options */}
              <Collapsible open={showBoot} onOpenChange={setShowBoot}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showBoot ? '' : '-rotate-90'}`} />
                    Boot / PXE Options
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 pl-6 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Server Address (TFTP)</Label>
                    <Input
                      value={scopeForm.serverAddress}
                      onChange={(e) => updateForm('serverAddress', e.target.value)}
                      placeholder="e.g., 192.168.1.1"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Next server IP for bootstrap (siaddr)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Server Host Name</Label>
                    <Input
                      value={scopeForm.serverHostName}
                      onChange={(e) => updateForm('serverHostName', e.target.value)}
                      placeholder="e.g., tftp-server-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Boot File Name</Label>
                    <Input
                      value={scopeForm.bootFileName}
                      onChange={(e) => updateForm('bootFileName', e.target.value)}
                      placeholder="e.g., boot.bin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TFTP Server Addresses</Label>
                    <Input
                      value={scopeForm.tftpServerAddresses}
                      onChange={(e) => updateForm('tftpServerAddresses', e.target.value)}
                      placeholder="Comma-separated IPs"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CAPWAP AC IP Addresses</Label>
                    <Input
                      value={scopeForm.capwapAcIpAddresses}
                      onChange={(e) => updateForm('capwapAcIpAddresses', e.target.value)}
                      placeholder="Comma-separated IPs"
                      className="font-mono"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Exclusions & Reservations */}
              <Collapsible open={showExclusions} onOpenChange={setShowExclusions}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showExclusions ? '' : '-rotate-90'}`} />
                    Exclusions & Reservations
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 pl-6 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Exclusions</Label>
                    <Input
                      value={scopeForm.exclusions}
                      onChange={(e) => updateForm('exclusions', e.target.value)}
                      placeholder="startIP|endIP, startIP|endIP, ..."
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Pipe-separated IP ranges to exclude from allocation</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reserved Leases</Label>
                    <Input
                      value={scopeForm.reservedLeases}
                      onChange={(e) => updateForm('reservedLeases', e.target.value)}
                      placeholder="hostname|MAC|IP|comments, ..."
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">Pipe-separated: hostname|hardwareAddress|ipAddress|comments</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Only Reserved Leases</Label>
                      <p className="text-xs text-muted-foreground">Stop dynamic allocation, serve only reservations</p>
                    </div>
                    <Switch
                      checked={scopeForm.allowOnlyReservedLeases === 'true'}
                      onCheckedChange={(checked) => updateForm('allowOnlyReservedLeases', checked ? 'true' : 'false')}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Advanced */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
                    Advanced
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 pl-6 border-l-2 border-muted ml-2">
                  <div className="space-y-2">
                    <Label>Offer Delay Time (ms)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={scopeForm.offerDelayTime}
                      onChange={(e) => updateForm('offerDelayTime', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ping Check</Label>
                      <p className="text-xs text-muted-foreground">Check if IP is in use before assigning</p>
                    </div>
                    <Switch
                      checked={scopeForm.pingCheckEnabled === 'true'}
                      onCheckedChange={(checked) => updateForm('pingCheckEnabled', checked ? 'true' : 'false')}
                    />
                  </div>
                  {scopeForm.pingCheckEnabled === 'true' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ping Timeout (ms)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={scopeForm.pingCheckTimeout}
                          onChange={(e) => updateForm('pingCheckTimeout', e.target.value)}
                          placeholder="1000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ping Retries</Label>
                        <Input
                          type="number"
                          min="0"
                          value={scopeForm.pingCheckRetries}
                          onChange={(e) => updateForm('pingCheckRetries', e.target.value)}
                          placeholder="2"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Block Locally Administered MACs</Label>
                      <p className="text-xs text-muted-foreground">Reject devices with spoofed MAC addresses</p>
                    </div>
                    <Switch
                      checked={scopeForm.blockLocallyAdministeredMacAddresses === 'true'}
                      onCheckedChange={(checked) => updateForm('blockLocallyAdministeredMacAddresses', checked ? 'true' : 'false')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ignore Client Identifier</Label>
                      <p className="text-xs text-muted-foreground">Always use MAC address as identifier</p>
                    </div>
                    <Switch
                      checked={scopeForm.ignoreClientIdentifierOption === 'true'}
                      onCheckedChange={(checked) => updateForm('ignoreClientIdentifierOption', checked ? 'true' : 'false')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor Info</Label>
                    <Input
                      value={scopeForm.vendorInfo}
                      onChange={(e) => updateForm('vendorInfo', e.target.value)}
                      placeholder="identifier|information, ..."
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Generic Options</Label>
                    <Input
                      value={scopeForm.genericOptions}
                      onChange={(e) => updateForm('genericOptions', e.target.value)}
                      placeholder="code|hex-value, ..."
                      className="font-mono"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <IsotopeSpinner size="sm" className="mr-2" />}
            {editingScope ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---

export default function Dhcp() {
  useDocumentTitle('DHCP');
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'scopes';

  // Data fetching
  const { data: scopesData, isLoading: scopesLoading, refetch: refetchScopes } = useApi(
    () => listDhcpScopes(), []
  );
  const { data: leasesData, isLoading: leasesLoading, refetch: refetchLeases } = useApi(
    () => listDhcpLeases(), []
  );

  const scopes = useMemo(() => scopesData?.scopes ?? [], [scopesData?.scopes]);
  const leases = useMemo(() => leasesData?.leases ?? [], [leasesData?.leases]);
  const isLoading = scopesLoading || leasesLoading;

  // Computed stats
  const totalScopes = scopes.length;
  const activeScopes = scopes.filter(s => s.enabled).length;
  const totalLeases = leases.length;
  const reservedLeases = leases.filter(l => l.type === 'Reserved').length;
  const dynamicLeases = totalLeases - reservedLeases;

  // Dialog state
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [editingScope, setEditingScope] = useState<DhcpScopeListItem | null>(null);

  // AlertDialog state
  const [scopeToDelete, setScopeToDelete] = useState<string | null>(null);
  const [leaseToRemove, setLeaseToRemove] = useState<DhcpLease | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleTabChange = (value: string) => {
    if (value === 'scopes') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleRefresh = () => {
    refetchScopes();
    refetchLeases();
  };

  const handleOpenAddScope = () => {
    setEditingScope(null);
    setShowScopeDialog(true);
  };

  const handleOpenEditScope = (scope: DhcpScopeListItem) => {
    setEditingScope(scope);
    setShowScopeDialog(true);
  };

  const handleToggleScope = async (scope: DhcpScopeListItem) => {
    setProcessing(true);
    const response = scope.enabled
      ? await disableDhcpScope(scope.name)
      : await enableDhcpScope(scope.name);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success(`Scope ${scope.enabled ? 'disabled' : 'enabled'} successfully`);
      refetchScopes();
    } else {
      toast.error(response.errorMessage || 'Failed to toggle scope');
    }
  };

  const handleDeleteScope = async () => {
    if (!scopeToDelete) return;
    setProcessing(true);
    const response = await deleteDhcpScope(scopeToDelete);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Scope deleted successfully');
      setScopeToDelete(null);
      refetchScopes();
    } else {
      toast.error(response.errorMessage || 'Failed to delete scope');
    }
  };

  const handleRemoveLease = async () => {
    if (!leaseToRemove) return;
    setProcessing(true);
    const response = await removeDhcpLease(leaseToRemove.scope, leaseToRemove.hardwareAddress);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Lease removed successfully');
      setLeaseToRemove(null);
      refetchLeases();
    } else {
      toast.error(response.errorMessage || 'Failed to remove lease');
    }
  };

  const handleConvertToReserved = async (lease: DhcpLease) => {
    setProcessing(true);
    const response = await convertLeaseToReserved(lease.scope, lease.hardwareAddress);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Lease converted to reserved');
      refetchLeases();
    } else {
      toast.error(response.errorMessage || 'Failed to convert lease');
    }
  };

  const handleConvertToDynamic = async (lease: DhcpLease) => {
    setProcessing(true);
    const response = await convertLeaseToDynamic(lease.scope, lease.hardwareAddress);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Lease converted to dynamic');
      refetchLeases();
    } else {
      toast.error(response.errorMessage || 'Failed to convert lease');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DHCP Server</h1>
        <p className="text-muted-foreground mt-1">
          Manage DHCP scopes and IP address leases
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero Status Card */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Network className="h-6 w-6 text-primary" />
                    DHCP Status
                  </CardTitle>
                  <CardDescription>
                    IP address allocation and lease management
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stat Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      Total Scopes
                    </span>
                  </div>
                  {scopesLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-50">
                      {totalScopes}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Power className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-900 dark:text-green-100">
                      Active Scopes
                    </span>
                  </div>
                  {scopesLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-bold text-green-900 dark:text-green-50">
                      {activeScopes}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                      Total Leases
                    </span>
                  </div>
                  {leasesLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-50">
                      {totalLeases}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-medium text-amber-900 dark:text-amber-100">
                      Reserved
                    </span>
                  </div>
                  {leasesLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-bold text-amber-900 dark:text-amber-50">
                      {reservedLeases}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={handleOpenAddScope}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Scope
                </Button>
                {!isLoading && totalLeases > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {dynamicLeases} dynamic, {reservedLeases} reserved leases
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scopes" className="gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Scopes</span>
              </TabsTrigger>
              <TabsTrigger value="leases" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Leases</span>
              </TabsTrigger>
            </TabsList>

            {/* Scopes Tab */}
            <TabsContent value="scopes" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {scopesLoading ? (
                    <div className="divide-y">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3">
                          <Skeleton className="h-2.5 w-2.5 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-4 w-48 flex-1" />
                        </div>
                      ))}
                    </div>
                  ) : scopes.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground">No DHCP scopes configured</p>
                      <Button variant="outline" size="sm" className="mt-3" onClick={handleOpenAddScope}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add your first scope
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {scopes.map((scope) => (
                        <div
                          key={scope.name}
                          className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors group"
                        >
                          <div
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              scope.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                            }`}
                          />
                          <div className="font-medium text-sm min-w-[80px] sm:min-w-[120px] truncate">
                            {scope.name}
                          </div>
                          <Badge
                            variant={scope.enabled ? 'default' : 'secondary'}
                            className="text-xs shrink-0 hidden sm:inline-flex"
                          >
                            {scope.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <div className="flex-1 font-mono text-sm text-muted-foreground truncate hidden sm:block">
                            {scope.startingAddress} - {scope.endingAddress}
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0 hidden md:block font-mono">
                            /{subnetToCidr(scope.subnetMask)}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEditScope(scope)}
                              disabled={processing}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleScope(scope)}
                              disabled={processing}
                            >
                              {scope.enabled ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setScopeToDelete(scope.name)}
                              disabled={processing}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leases Tab */}
            <TabsContent value="leases" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {leasesLoading ? (
                    <div className="divide-y">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-4 w-32 flex-1" />
                        </div>
                      ))}
                    </div>
                  ) : leases.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground">No DHCP leases found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {leases.map((lease, idx) => (
                        <div
                          key={`${lease.scope}-${lease.hardwareAddress}-${idx}`}
                          className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors group"
                        >
                          <Badge
                            variant={lease.type === 'Reserved' ? 'default' : 'outline'}
                            className="w-20 justify-center text-xs font-mono shrink-0"
                          >
                            {lease.type}
                          </Badge>
                          <div className="min-w-0">
                            <div className="font-mono text-sm font-medium">{lease.address}</div>
                            {lease.hostName && (
                              <div className="text-xs text-muted-foreground truncate">
                                {lease.hostName}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">
                            {lease.scope}
                          </Badge>
                          <div className="flex-1 font-mono text-xs text-muted-foreground hidden md:block truncate">
                            {lease.hardwareAddress}
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                            {formatLeaseExpiry(lease.leaseExpires)}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                lease.type === 'Reserved'
                                  ? handleConvertToDynamic(lease)
                                  : handleConvertToReserved(lease)
                              }
                              disabled={processing}
                            >
                              {lease.type === 'Reserved' ? 'To Dynamic' : 'To Reserved'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setLeaseToRemove(lease)}
                              disabled={processing}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Guidance (1/3) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Understanding DHCP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Scopes</p>
                  <p className="text-sm text-muted-foreground">
                    Define IP address ranges the DHCP server can assign to clients on your network
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Leases</p>
                  <p className="text-sm text-muted-foreground">
                    Track which IP addresses have been assigned to which devices and when they expire
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Reservations</p>
                  <p className="text-sm text-muted-foreground">
                    Ensure specific devices always receive the same IP address based on their MAC address
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> Enable a scope to start serving DHCP requests. Disabled scopes retain their configuration but do not allocate addresses.
            </p>
          </div>
        </div>
      </div>

      {/* Scope Edit Dialog */}
      <ScopeEditDialog
        open={showScopeDialog}
        onOpenChange={setShowScopeDialog}
        editingScope={editingScope}
        onSaved={() => refetchScopes()}
      />

      {/* Delete Scope Confirmation */}
      <AlertDialog open={!!scopeToDelete} onOpenChange={() => !processing && setScopeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scope?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the scope "{scopeToDelete}"? All associated configuration will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScope}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? 'Deleting...' : 'Delete Scope'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Lease Confirmation */}
      <AlertDialog open={!!leaseToRemove} onOpenChange={() => !processing && setLeaseToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Lease?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the lease for {leaseToRemove?.address} ({leaseToRemove?.hardwareAddress})? Make sure there is no IP address conflict before removing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveLease}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? 'Removing...' : 'Remove Lease'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
