import { useMemo, useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Globe,
  Timer,
  HardDrive,
  Flag,
  FileText,
  Hash,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ChevronsUpDown,
  type LucideIcon,
} from 'lucide-react';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CopyableText } from '@/components/ui/copyable-text';
import { resolveDns, type DnsQueryResult } from '@/api/dnsClient';
import { getClusterState } from '@/api/cluster';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const RECORD_TYPES = [
  'A', 'AAAA', 'NS', 'CNAME', 'SOA', 'PTR', 'MX', 'TXT',
  'SRV', 'CAA', 'DNSKEY', 'DS', 'RRSIG', 'NSEC', 'NSEC3', 'TLSA', 'SVCB', 'HTTPS'
];

const COMMON_QUERIES: { label: string; type: string; icon: LucideIcon }[] = [
  { label: 'Mail Servers', type: 'MX', icon: Mail },
  { label: 'Name Servers', type: 'NS', icon: Globe },
  { label: 'Text Records', type: 'TXT', icon: FileText },
  { label: 'IPv4 Address', type: 'A', icon: Hash },
  { label: 'IPv6 Address', type: 'AAAA', icon: Hash },
  { label: 'DNSSEC Keys', type: 'DNSKEY', icon: ShieldCheck },
];

// "This Server" resolves internally on the node the session is on. The other
// cluster nodes are inserted between these local modes and the public resolvers
// as explicit DNS targets, in Technitium's "name (ip)" server-address format.
const LOCAL_SERVERS = [
  { value: 'this-server', label: 'This Server' },
  { value: 'recursive-resolver', label: 'Recursive Resolver' },
  { value: 'system-dns', label: 'System DNS' },
];

const PUBLIC_SERVERS = [
  { value: '1.1.1.1', label: 'Cloudflare (1.1.1.1)' },
  { value: '8.8.8.8', label: 'Google (8.8.8.8)' },
  { value: '9.9.9.9', label: 'Quad9 (9.9.9.9)' },
  { value: '208.67.222.222', label: 'OpenDNS (208.67.222.222)' },
  { value: '94.140.14.14', label: 'AdGuard (94.140.14.14)' },
];

// The 13 root servers, in Technitium's "name (ip)" server-address format.
// Note b.root-servers.net moved to 170.247.170.2 in 2023.
const ROOT_SERVERS = [
  'a.root-servers.net (198.41.0.4)',
  'b.root-servers.net (170.247.170.2)',
  'c.root-servers.net (192.33.4.12)',
  'd.root-servers.net (199.7.91.13)',
  'e.root-servers.net (192.203.230.10)',
  'f.root-servers.net (192.5.5.241)',
  'g.root-servers.net (192.112.36.4)',
  'h.root-servers.net (198.97.190.53)',
  'i.root-servers.net (192.36.148.17)',
  'j.root-servers.net (192.58.128.30)',
  'k.root-servers.net (193.0.14.129)',
  'l.root-servers.net (199.7.83.42)',
  'm.root-servers.net (202.12.27.33)',
].map((value) => ({ value, label: value }));

type ServerOption = { value: string; label: string };
type ServerGroup = { heading: string; options: ServerOption[] };

// A searchable combobox rather than a Select: with the root servers included the
// list runs past 25 entries, which is well past where a scroll-only dropdown is
// usable. Typing filters across both the label and the address, so "adguard",
// "94.140" and "k.root" all land on the right entry.
function ServerPicker({
  id,
  className,
  value,
  label,
  groups,
  customServer,
  onSelect,
  onEditCustom,
}: {
  id?: string;
  className?: string;
  value: string;
  label: string;
  groups: ServerGroup[];
  customServer: string;
  onSelect: (value: string) => void;
  onEditCustom: () => void;
}) {
  const [open, setOpen] = useState(false);
  const choose = (next: string) => {
    onSelect(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', className)}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0">
        <Command>
          <CommandInput placeholder="Search servers..." />
          <CommandList>
            <CommandEmpty>No server found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.options.map((s) => (
                  <CommandItem
                    // cmdk matches on this string, so both the friendly name and
                    // the address are searchable. Selection goes through the
                    // closure below, since cmdk lowercases the onSelect argument.
                    key={s.value}
                    value={`${s.label} ${s.value}`}
                    onSelect={() => choose(s.value)}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4 shrink-0', value === s.value ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="truncate">{s.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup heading="Custom">
              {customServer && (
                <CommandItem value={`custom ${customServer}`} onSelect={() => choose('custom')}>
                  <Check
                    className={cn('mr-2 h-4 w-4 shrink-0', value === 'custom' ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="truncate">{customServer}</span>
                </CommandItem>
              )}
              <CommandItem
                value="custom server address"
                onSelect={() => {
                  onEditCustom();
                  setOpen(false);
                }}
              >
                <span className="ml-6 truncate">
                  {customServer ? 'Edit custom server...' : 'Custom...'}
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function DnsClient() {
  useDocumentTitle("DNS Client");
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [server, setServer] = useState('this-server');
  // Applied custom target, composed into Technitium's "name (ip)" format below.
  const [customName, setCustomName] = useState('');
  const [customIp, setCustomIp] = useState('');
  // Dialog-local drafts so Cancel doesn't mutate the applied target.
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftIp, setDraftIp] = useState('');
  const [protocol, setProtocol] = useState<'Udp' | 'Tcp' | 'Tls' | 'Https' | 'Quic'>('Udp');
  const [dnssec, setDnssec] = useState(false);
  const [ednsSubnet, setEdnsSubnet] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [result, setResult] = useState<DnsQueryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "custom" is the sentinel picker value for the user-defined target; the
  // editor is opened by its own action row rather than by selecting a value.
  const isCustom = server === 'custom';
  const customServer =
    customName.trim() && customIp.trim()
      ? `${customName.trim()} (${customIp.trim()})`
      : customIp.trim() || customName.trim();

  const openCustomDialog = () => {
    setDraftName(customName);
    setDraftIp(customIp);
    setCustomDialogOpen(true);
  };

  const applyCustom = () => {
    if (!draftName.trim() && !draftIp.trim()) return;
    setCustomName(draftName.trim());
    setCustomIp(draftIp.trim());
    setServer('custom');
    setCustomDialogOpen(false);
  };

  // Other cluster nodes become selectable DNS targets. Fails quietly for
  // non-clustered servers or users without cluster-view permission — the group
  // simply doesn't render and the preset list is unchanged.
  const { data: clusterState } = useApi(() => getClusterState(), []);
  const clusterServers = useMemo(() => {
    if (!clusterState?.clusterInitialized || !clusterState.clusterNodes) return [];
    return clusterState.clusterNodes
      .filter((node) => node.state !== 'Self')
      .map((node) => {
        const ip = node.ipAddresses?.[0];
        const value = ip ? `${node.name} (${ip})` : node.name;
        return { value, label: value };
      });
  }, [clusterState]);

  // Every section is headed now — with the root servers in the list there are
  // too many entries for an unlabeled run to stay readable.
  const serverGroups = useMemo<ServerGroup[]>(
    () => [
      { heading: 'Local', options: LOCAL_SERVERS },
      ...(clusterServers.length > 0
        ? [{ heading: 'Cluster Nodes', options: clusterServers }]
        : []),
      { heading: 'Public Resolvers', options: PUBLIC_SERVERS },
      { heading: 'Root Servers', options: ROOT_SERVERS },
    ],
    [clusterServers]
  );

  const serverLabel = isCustom
    ? customServer
    : serverGroups.flatMap((g) => g.options).find((s) => s.value === server)?.label ?? server;

  const handleQuery = async (typeOverride?: string) => {
    if (!domain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    const targetServer = isCustom ? customServer : server;
    if (!targetServer) {
      setError('Please set a custom server address');
      return;
    }

    setIsQuerying(true);
    setResult(null);
    setError(null);

    const response = await resolveDns({
      server: targetServer,
      domain: domain.trim(),
      type: typeOverride || recordType,
      protocol,
      dnssec,
      eDnsClientSubnet: ednsSubnet || undefined,
    });

    setIsQuerying(false);

    if (response.status === 'ok' && response.response) {
      setResult(response.response.result);
      if (typeOverride) setRecordType(typeOverride);
      setError(null);
    } else {
      setError(response.errorMessage || 'Query failed');
    }
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
  };

  const handleCopyJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatSvcParamValue = (key: string, value: string): string => {
    if (['alpn', 'ipv4hint', 'ipv6hint', 'mandatory'].includes(key)) {
      return value.split(',').map(v => v.trim()).join(', ');
    }
    return value;
  };

  const formatRData = (record: { Name: string; Type: string; Class: string; TTL: number; RDLENGTH: number; RDATA: Record<string, unknown> }): string => {
    const rdata = record.RDATA;

    switch (record.Type) {
      case 'A':
      case 'AAAA':
        return (rdata.IPAddress as string) || '';
      case 'NS':
      case 'CNAME':
      case 'PTR':
        return (rdata.NameServer || rdata.Domain || rdata.PtrDomainName) as string || '';
      case 'MX':
        return `${rdata.Preference || ''} ${rdata.Exchange || ''}`;
      case 'TXT':
        return (rdata.Text as string) || '';
      case 'SOA':
        return `${rdata.PrimaryNameServer || ''} ${rdata.ResponsiblePerson || ''}`;
      case 'SRV':
        return `${rdata.Priority || 0} ${rdata.Weight || 0} ${rdata.Port || 0} ${rdata.Target || ''}`;
      case 'CAA':
        return `${rdata.Flags || 0} ${rdata.Tag || ''} "${rdata.Value || ''}"`;
      case 'DS':
        return `${rdata.KeyTag || ''} ${rdata.Algorithm || ''} ${rdata.DigestType || ''} ${rdata.Digest || ''}`;
      case 'DNSKEY': {
        const pk = String(rdata.PublicKey || '');
        return `${rdata.Flags || ''} ${rdata.Protocol || ''} ${rdata.Algorithm || ''} ${pk.length > 20 ? pk.substring(0, 20) + '...' : pk}`;
      }
      case 'TLSA': {
        const certData = String(rdata.CertificateAssociationData || '');
        return `${rdata.CertificateUsage || ''} ${rdata.Selector || ''} ${rdata.MatchingType || ''} ${certData.length > 32 ? certData.substring(0, 32) + '...' : certData}`;
      }
      case 'RRSIG':
        return `${rdata.TypeCovered || ''} ${rdata.Algorithm || ''} ${rdata.Labels || ''} ${rdata.SignersName || ''}`;
      case 'NSEC':
        return `${rdata.NextDomainName || ''} ${Array.isArray(rdata.Types) ? (rdata.Types as string[]).join(' ') : rdata.Types || ''}`;
      case 'NSEC3':
        return `${rdata.NextHashedOwnerName || ''} ${Array.isArray(rdata.Types) ? (rdata.Types as string[]).join(' ') : rdata.Types || ''}`;
      case 'HTTPS':
      case 'SVCB': {
        const parts = [String(rdata.SvcPriority ?? 0), String(rdata.TargetName || '.')];
        const params = rdata.SvcParams as Record<string, unknown> | undefined;
        if (params && Object.keys(params).length > 0) {
          parts.push(Object.entries(params).map(([k, v]) => `${k}=${v}`).join(' '));
        }
        return parts.join(' ');
      }
      case 'FWD':
        return `${rdata.Protocol ? (rdata.Protocol as string).toUpperCase() : ''}: ${rdata.Forwarder || ''}`;
      case 'OPT': {
        const options = rdata.Options as unknown[] | undefined;
        if (!options || options.length === 0) return '';
        return JSON.stringify(rdata);
      }
      default:
        return JSON.stringify(rdata);
    }
  };

  const getRCodeColor = (rcode: string) => {
    switch (rcode) {
      case 'NoError':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'NXDomain':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const getRCodeIcon = (rcode: string) => {
    switch (rcode) {
      case 'NoError':
        return <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />;
      case 'NXDomain':
        return <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />;
      default:
        return <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />;
    }
  };

  const formatProtocol = (protocol: string) => {
    return protocol.toUpperCase();
  };

  const renderHttpsSvcbRecord = (record: { Name: string; Type: string; Class: string; TTL: number; RDLENGTH: number; RDATA: Record<string, unknown> }, idx: number) => {
    const rdata = record.RDATA;
    const priority = (rdata.SvcPriority as number) ?? 0;
    const targetName = (rdata.TargetName as string) || '.';
    const svcParams = rdata.SvcParams as Record<string, string> | undefined;
    const isAlias = priority === 0;

    return (
      <div key={idx} className="px-4 py-3.5 hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3">
          <Badge variant="outline" className="mt-0.5 w-14 justify-center font-mono text-xs shrink-0 h-6">
            {record.Type}
          </Badge>

          <div className="flex-1 min-w-0 space-y-3">
            {/* Record name */}
            {record.Name && record.Name !== '.' && (
              <div>
                <CopyableText
                  text={record.Name}
                  className="font-mono text-sm font-medium break-all"
                />
              </div>
            )}

            {/* Priority + Target */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Priority</span>
                <span className="font-mono text-sm font-medium">{priority}</span>
                {isAlias && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Alias</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Target</span>
                {targetName === '.' || targetName === '' ? (
                  <span className="font-mono text-sm text-muted-foreground">
                    . <span className="text-xs italic">(owner)</span>
                  </span>
                ) : (
                  <CopyableText
                    text={targetName}
                    className="font-mono text-sm break-all"
                  />
                )}
              </div>
            </div>

            {/* Service Parameters */}
            {svcParams && Object.keys(svcParams).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  Service Parameters
                </span>
                <div className="rounded-md border divide-y">
                  {Object.entries(svcParams).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 px-3 py-1.5 min-w-0">
                      <span className="font-mono text-xs text-muted-foreground shrink-0 pt-px">
                        {key}
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <CopyableText
                          text={formatSvcParamValue(key, String(value))}
                          className="font-mono text-sm text-muted-foreground max-w-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[80px]">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">TTL</div>
            <div className="text-sm font-medium tabular-nums">{record.TTL}s</div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecordRow = (record: { Name: string; Type: string; Class: string; TTL: number; RDLENGTH: number; RDATA: Record<string, unknown> }, idx: number) => {
    if (record.Type === 'HTTPS' || record.Type === 'SVCB') {
      return renderHttpsSvcbRecord(record, idx);
    }

    const rdata = formatRData(record);
    return (
      <div key={idx} className="px-4 py-3.5 hover:bg-muted/50 transition-colors">
        <div className="flex items-start gap-3">
          <Badge variant="outline" className="mt-0.5 w-14 justify-center font-mono text-xs shrink-0 h-6">
            {record.Type}
          </Badge>
          <div className="flex-1 min-w-0 space-y-1">
            {record.Name && record.Name !== '.' && (
              <div>
                <CopyableText
                  text={record.Name}
                  className="font-mono text-sm font-medium break-all"
                />
              </div>
            )}
            {rdata && (
              <div>
                <CopyableText
                  text={rdata}
                  className="font-mono text-sm text-muted-foreground break-all"
                />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[80px]">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/60">TTL</div>
            <div className="text-sm font-medium tabular-nums">{record.TTL}s</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DNS Client</h1>
        <p className="text-muted-foreground mt-1">
          Resolve DNS records and diagnose name resolution issues
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Query Form */}
          <Card className="border-2">
            <CardContent className="pt-6">
              {/* Mobile form layout */}
              <div className="space-y-4 sm:hidden">
                {/* Domain input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="domain-mobile"
                    placeholder="Domain name"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                    className={`pl-9 ${domain ? 'pr-8' : ''}`}
                  />
                  {domain && (
                    <button
                      type="button"
                      onClick={() => { setDomain(''); handleClear(); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Clear"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Type + Resolve */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="type-mobile" className="text-xs text-muted-foreground">Record Type</Label>
                    <Select value={recordType} onValueChange={setRecordType}>
                      <SelectTrigger id="type-mobile" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECORD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground invisible" aria-hidden>Action</Label>
                    <Button onClick={() => handleQuery()} disabled={isQuerying} className="w-full">
                      {isQuerying ? (
                        <IsotopeSpinner size="sm" className="mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      {isQuerying ? 'Resolving...' : 'Resolve'}
                    </Button>
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t" />

                {/* Server */}
                <div className="space-y-1.5">
                  <Label htmlFor="server-mobile" className="text-xs text-muted-foreground">Server</Label>
                  <ServerPicker
                    id="server-mobile"
                    className="w-full"
                    value={server}
                    label={serverLabel}
                    groups={serverGroups}
                    customServer={customServer}
                    onSelect={setServer}
                    onEditCustom={openCustomDialog}
                  />
                </div>

                {/* Protocol + EDNS */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="protocol-mobile" className="text-xs text-muted-foreground">Protocol</Label>
                    <Select value={protocol} onValueChange={(v: typeof protocol) => setProtocol(v)}>
                      <SelectTrigger id="protocol-mobile" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Udp">UDP</SelectItem>
                        <SelectItem value="Tcp">TCP</SelectItem>
                        <SelectItem value="Tls">TLS</SelectItem>
                        <SelectItem value="Https">HTTPS</SelectItem>
                        <SelectItem value="Quic">QUIC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edns-mobile" className="text-xs text-muted-foreground">EDNS Subnet</Label>
                    <Input
                      id="edns-mobile"
                      placeholder="e.g. 1.2.3.4/24"
                      value={ednsSubnet}
                      onChange={(e) => setEdnsSubnet(e.target.value)}
                    />
                  </div>
                </div>

                {/* DNSSEC */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dnssec-mobile"
                    checked={dnssec}
                    onCheckedChange={(checked) => setDnssec(checked === true)}
                  />
                  <Label htmlFor="dnssec-mobile" className="text-sm font-normal cursor-pointer">
                    Enable DNSSEC validation
                  </Label>
                </div>
              </div>

              {/* Desktop form layout */}
              <div className="hidden sm:block space-y-3">
                {/* Domain + Type + Resolve */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="domain"
                      placeholder="Domain name"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                      className={`pl-9 ${domain ? 'pr-8' : ''}`}
                    />
                    {domain && (
                      <button
                        type="button"
                        onClick={() => { setDomain(''); handleClear(); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title="Clear"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Select value={recordType} onValueChange={setRecordType}>
                    <SelectTrigger className="w-28 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECORD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleQuery()} disabled={isQuerying} className="shrink-0">
                    {isQuerying ? (
                      <IsotopeSpinner size="sm" className="mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    {isQuerying ? 'Resolving...' : 'Resolve'}
                  </Button>
                </div>

                {/* Server + Protocol + EDNS + DNSSEC */}
                <div className="flex gap-3 items-center flex-wrap">
                  <ServerPicker
                    className="w-44"
                    value={server}
                    label={serverLabel}
                    groups={serverGroups}
                    customServer={customServer}
                    onSelect={setServer}
                    onEditCustom={openCustomDialog}
                  />
                  <Select value={protocol} onValueChange={(v: typeof protocol) => setProtocol(v)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Udp">UDP</SelectItem>
                      <SelectItem value="Tcp">TCP</SelectItem>
                      <SelectItem value="Tls">TLS</SelectItem>
                      <SelectItem value="Https">HTTPS</SelectItem>
                      <SelectItem value="Quic">QUIC</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="edns"
                    placeholder="EDNS subnet"
                    value={ednsSubnet}
                    onChange={(e) => setEdnsSubnet(e.target.value)}
                    className="w-36"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dnssec"
                      checked={dnssec}
                      onCheckedChange={(checked) => setDnssec(checked === true)}
                    />
                    <Label htmlFor="dnssec" className="text-sm font-normal cursor-pointer whitespace-nowrap">
                      DNSSEC
                    </Label>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          {isQuerying && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-48" />
                  <div className="flex-1" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!isQuerying && !result && !error && (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Ready to Query</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Enter a domain name above and click Resolve to look up DNS records.
                  Use Quick Queries in the sidebar for common lookups.
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      {getRCodeIcon(result.RCODE)}
                      <Badge className={getRCodeColor(result.RCODE)}>
                        {result.RCODE}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.Question?.[0]?.Type || recordType} via {result.Metadata.NameServer}
                      </span>
                    </div>
                    <div className="font-mono text-base font-semibold break-all">
                      {result.Question?.[0]?.Name || domain}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyJson} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Metadata Stat Boxes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Protocol</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-blue-900 dark:text-blue-50">
                      {formatProtocol(result.Metadata.Protocol)}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-1">
                      <HardDrive className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-900 dark:text-purple-100">Size</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-purple-900 dark:text-purple-50">
                      {result.Metadata.DatagramSize}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Timer className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-900 dark:text-green-100">Round Trip</span>
                    </div>
                    <div className="text-lg font-bold font-mono text-green-900 dark:text-green-50">
                      {result.Metadata.RoundTripTime}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Flag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-900 dark:text-amber-100">Flags</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {result.AuthoritativeAnswer && <Badge variant="outline" className="text-xs">AA</Badge>}
                      {result.RecursionAvailable && <Badge variant="outline" className="text-xs">RA</Badge>}
                      {result.AuthenticData && <Badge variant="outline" className="text-xs">AD</Badge>}
                      {result.Truncation && <Badge variant="outline" className="text-xs">TC</Badge>}
                      {!result.AuthoritativeAnswer && !result.RecursionAvailable && !result.AuthenticData && !result.Truncation && (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Answer Section */}
                {result.Answer && result.Answer.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Answer
                      <Badge variant="secondary" className="font-mono text-xs">{result.ANCOUNT}</Badge>
                    </h3>
                    <Card>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {result.Answer.map(renderRecordRow)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Authority Section */}
                {result.Authority && result.Authority.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Authority
                      <Badge variant="secondary" className="font-mono text-xs">{result.NSCOUNT}</Badge>
                    </h3>
                    <Card>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {result.Authority.map(renderRecordRow)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Additional Section */}
                {result.Additional && result.Additional.filter(r => r.Type !== 'OPT' || ((r.RDATA.Options as unknown[] | undefined)?.length ?? 0) > 0).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Additional
                      <Badge variant="secondary" className="font-mono text-xs">
                        {result.Additional.filter(r => r.Type !== 'OPT' || ((r.RDATA.Options as unknown[] | undefined)?.length ?? 0) > 0).length}
                      </Badge>
                    </h3>
                    <Card>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {result.Additional.filter(r => r.Type !== 'OPT' || ((r.RDATA.Options as unknown[] | undefined)?.length ?? 0) > 0).map(renderRecordRow)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* No Records */}
                {result.ANCOUNT === 0 && result.NSCOUNT === 0 && (
                  <div className="p-8 text-center">
                    <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="font-semibold mb-1">No Records Found</h3>
                    <p className="text-sm text-muted-foreground">
                      The query returned no answer or authority records for this domain.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Quick Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Queries</CardTitle>
              <CardDescription className="text-xs">
                {domain.trim() ? `Query ${domain} for:` : 'Enter a domain, then select a query type'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {COMMON_QUERIES.map((query) => (
                <Button
                  key={query.type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuery(query.type)}
                  disabled={isQuerying || !domain.trim()}
                  className="w-full justify-start"
                >
                  <query.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1 text-left">{query.label}</span>
                  <Badge variant="secondary" className="ml-2 font-mono text-xs">
                    {query.type}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Understanding Results Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Understanding Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Answer Section</p>
                  <p className="text-sm text-muted-foreground">
                    Direct answers to your query — the records you asked for
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Authority Section</p>
                  <p className="text-sm text-muted-foreground">
                    Name servers authoritative for the domain
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Additional Section</p>
                  <p className="text-sm text-muted-foreground">
                    Extra records like IP addresses of name servers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tip Box */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Tip:</strong> Use "Recursive Resolver" to see the full resolution path, or query
              external servers like Cloudflare (1.1.1.1) to compare results.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Custom DNS Server</DialogTitle>
            <DialogDescription>
              Target a specific server by name, IP, or both. Providing both pins
              the hostname to that IP — matching how cluster nodes are addressed,
              and letting TLS/HTTPS/QUIC validate the certificate name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-name">
                Name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="custom-name"
                placeholder="dns.example.com"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-ip">
                IP Address <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="custom-ip"
                placeholder="10.0.7.22"
                value={draftIp}
                onChange={(e) => setDraftIp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
              />
            </div>
            {(draftName.trim() || draftIp.trim()) && (
              <div className="rounded-md bg-muted px-3 py-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  Server address
                </span>
                <div className="font-mono text-sm break-all">
                  {draftName.trim() && draftIp.trim()
                    ? `${draftName.trim()} (${draftIp.trim()})`
                    : draftIp.trim() || draftName.trim()}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyCustom} disabled={!draftName.trim() && !draftIp.trim()}>
              Use Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
