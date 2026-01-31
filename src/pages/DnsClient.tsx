import { useState } from 'react';
import { Search, Sparkles, Copy, Check, ChevronDown } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { resolveDns, type DnsQueryResult } from '@/api/dnsClient';
import { toast } from 'sonner';

const RECORD_TYPES = [
  'A', 'AAAA', 'NS', 'CNAME', 'SOA', 'PTR', 'MX', 'TXT',
  'SRV', 'CAA', 'DNSKEY', 'DS', 'RRSIG', 'NSEC', 'NSEC3', 'TLSA', 'SVCB', 'HTTPS'
];

const COMMON_QUERIES = [
  { label: 'Mail Servers (MX)', type: 'MX', icon: '📧' },
  { label: 'Name Servers (NS)', type: 'NS', icon: '🌐' },
  { label: 'Text Records (TXT)', type: 'TXT', icon: '📝' },
  { label: 'IPv4 Address (A)', type: 'A', icon: '🔢' },
  { label: 'IPv6 Address (AAAA)', type: 'AAAA', icon: '🔢' },
  { label: 'DNSSEC Keys', type: 'DNSKEY', icon: '🔐' },
];

const PRESET_SERVERS = [
  { value: 'this-server', label: 'This Server', description: 'Query this DNS server' },
  { value: 'recursive-resolver', label: 'Recursive Resolver', description: 'Perform full recursive resolution' },
  { value: 'system-dns', label: 'System DNS', description: 'Use system configured DNS' },
  { value: '1.1.1.1', label: 'Cloudflare (1.1.1.1)', description: 'Fast public DNS' },
  { value: '8.8.8.8', label: 'Google (8.8.8.8)', description: 'Reliable public DNS' },
  { value: '9.9.9.9', label: 'Quad9 (9.9.9.9)', description: 'Security-focused DNS' },
];

export default function DnsClient() {
  useDocumentTitle("DNS Client");
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [server, setServer] = useState('this-server');
  const [protocol, setProtocol] = useState<'Udp' | 'Tcp' | 'Tls' | 'Https' | 'Quic'>('Udp');
  const [dnssec, setDnssec] = useState(false);
  const [ednsSubnet, setEdnsSubnet] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [result, setResult] = useState<DnsQueryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!domain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    setIsQuerying(true);
    setResult(null);
    setError(null);

    const response = await resolveDns({
      server,
      domain: domain.trim(),
      type: recordType,
      protocol,
      dnssec,
      eDnsClientSubnet: ednsSubnet || undefined,
    });

    setIsQuerying(false);

    if (response.status === 'ok' && response.response) {
      setResult(response.response.result);
      setError(null);
    } else {
      setError(response.errorMessage || 'Query failed');
    }
  };

  const handleCopyJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
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
      case 'FWD':
        return `${rdata.Protocol ? (rdata.Protocol as string).toUpperCase() : ''}: ${rdata.Forwarder || ''}`;
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

  const formatProtocol = (protocol: string) => {
    return protocol.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DNS Client</h1>
        <p className="text-muted-foreground mt-1">Query DNS records with advanced options</p>
      </div>

      {/* Query Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Query Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              DNS Query
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Domain + Type Row */}
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                  className="text-base"
                />
              </div>
              <div className="space-y-2 sm:w-32">
                <Label htmlFor="type">Type</Label>
                <Select value={recordType} onValueChange={setRecordType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Server Selection */}
            <div className="space-y-2">
              <Label htmlFor="server">Name Server</Label>
              <Select value={server} onValueChange={setServer}>
                <SelectTrigger id="server">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_SERVERS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex flex-col items-start">
                        <span>{s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Options - Collapsible */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between -mx-3 px-3">
                  <span className="text-sm font-medium">Advanced Options</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select value={protocol} onValueChange={(v: typeof protocol) => setProtocol(v)}>
                    <SelectTrigger id="protocol">
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dnssec"
                    checked={dnssec}
                    onCheckedChange={(checked) => setDnssec(checked === true)}
                  />
                  <Label htmlFor="dnssec" className="text-sm font-normal cursor-pointer">
                    Enable DNSSEC Validation
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edns">EDNS Client Subnet</Label>
                  <Input
                    id="edns"
                    placeholder="192.168.1.0/24"
                    value={ednsSubnet}
                    onChange={(e) => setEdnsSubnet(e.target.value)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleQuery} disabled={isQuerying} size="lg" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              {isQuerying ? 'Querying...' : 'Resolve'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Queries Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Quick Queries
            </CardTitle>
            <CardDescription className="text-xs">Common record types</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {COMMON_QUERIES.map((query) => (
              <Button
                key={query.type}
                variant="outline"
                size="sm"
                onClick={() => setRecordType(query.type)}
                className="w-full justify-start"
              >
                <span className="mr-2">{query.icon}</span>
                <span className="flex-1 text-left">{query.label}</span>
                <Badge variant="secondary" className="ml-2 font-mono text-xs">
                  {query.type}
                </Badge>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Results
                  <Badge className={getRCodeColor(result.RCODE)}>
                    {result.RCODE}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {result.Metadata.NameServer} • {result.Metadata.RoundTripTime}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyJson}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Protocol</div>
                <div className="font-mono text-sm">{formatProtocol(result.Metadata.Protocol)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Size</div>
                <div className="font-mono text-sm">{result.Metadata.DatagramSize}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Round Trip Time</div>
                <div className="font-mono text-sm">{result.Metadata.RoundTripTime}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Flags</div>
                <div className="flex gap-1 flex-wrap">
                  {result.AuthoritativeAnswer && <Badge variant="outline" className="text-xs">AA</Badge>}
                  {result.RecursionAvailable && <Badge variant="outline" className="text-xs">RA</Badge>}
                  {result.AuthenticData && <Badge variant="outline" className="text-xs">AD</Badge>}
                </div>
              </div>
            </div>

            <Separator />

            {/* Answer Section */}
            {result.Answer && result.Answer.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Answer ({result.ANCOUNT})</h3>
                <div className="space-y-2">
                  {result.Answer.map((record, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {record.Type}
                            </Badge>
                            <span className="font-mono text-sm truncate">{record.Name}</span>
                          </div>
                          <div className="font-mono text-sm break-all">{formatRData(record)}</div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          TTL: {record.TTL}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Authority Section */}
            {result.Authority && result.Authority.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Authority ({result.NSCOUNT})</h3>
                <div className="space-y-2">
                  {result.Authority.map((record, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {record.Type}
                            </Badge>
                            <span className="font-mono text-sm truncate">{record.Name}</span>
                          </div>
                          <div className="font-mono text-sm break-all">{formatRData(record)}</div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          TTL: {record.TTL}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Section */}
            {result.Additional && result.Additional.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Additional ({result.ARCOUNT})</h3>
                <div className="space-y-2">
                  {result.Additional.map((record, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {record.Type}
                            </Badge>
                            <span className="font-mono text-sm truncate">{record.Name}</span>
                          </div>
                          <div className="font-mono text-sm break-all">{formatRData(record)}</div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          TTL: {record.TTL}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {result.ANCOUNT === 0 && result.NSCOUNT === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No records found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
