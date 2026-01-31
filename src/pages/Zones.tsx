import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Trash2,
  RefreshCw,
  Settings2,
  X,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyableText } from "@/components/ui/copyable-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApi } from "@/hooks/useApi";
import {
  listZones,
  createZone,
  deleteZone,
  enableZone,
  disableZone,
  getZoneRecords,
  addRecord,
  deleteRecord,
  listApps,
  type InstalledApp,
} from "@/api/dns";
import { toast } from "sonner";
import type { Zone, DnsRecord } from "@/types/api";

const zoneTypes = [
  { value: "Primary", label: "Primary Zone" },
  { value: "Secondary", label: "Secondary Zone" },
  { value: "Stub", label: "Stub Zone" },
  { value: "Forwarder", label: "Forwarder Zone" },
];

const recordTypes = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
  "NS",
  "SOA",
  "SRV",
  "CAA",
  "PTR",
  "APP",
  "FWD",
];

function ZoneTypeBadge({ type }: { type: Zone["type"] }) {
  const colors: Record<string, string> = {
    Primary: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Secondary:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    Stub: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    Forwarder:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    SecondaryForwarder:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    Catalog: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    SecondaryCatalog:
      "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  };

  return <Badge className={colors[type] || "bg-gray-100"}>{type}</Badge>;
}

function ZoneStatusBadge({ zone }: { zone: Zone }) {
  if (zone.disabled) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Disabled
      </Badge>
    );
  }
  if (zone.isExpired) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  if (zone.syncFailed) {
    return <Badge variant="destructive">Sync Failed</Badge>;
  }
  return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
      Active
    </Badge>
  );
}

function formatRData(record: DnsRecord): string {
  const rData = record.rData;
  switch (record.type) {
    case "A":
    case "AAAA":
      return String(rData.ipAddress || "");
    case "CNAME":
    case "NS":
    case "PTR":
      return String(rData.cname || rData.nameServer || rData.ptrName || "");
    case "MX":
      return `${rData.preference || 0} ${rData.exchange || ""}`;
    case "TXT":
      return String(rData.text || "");
    case "SRV":
      return `${rData.priority || 0} ${rData.weight || 0} ${rData.port || 0} ${rData.target || ""}`;
    case "CAA":
      return `${rData.flags || 0} ${rData.tag || ""} "${rData.value || ""}"`;
    case "SOA":
      return `${rData.primaryNameServer || ""} ${rData.responsiblePerson || ""}`;
    case "APP":
      return `${rData.appName || ""} (${rData.classPath || ""})`;
    case "FWD":
      return `${String(rData.protocol || "UDP").toUpperCase()}: ${rData.forwarder || ""}`;
    default:
      return JSON.stringify(rData);
  }
}

// Shared Record Form Component
interface RecordFormData {
  type: string;
  name: string;
  ttl: string;
  value: string;
  comments: string;
  expiryTtl: string;
  ptr: boolean;
  createPtrZone: boolean;
  // APP record specific fields
  appName?: string;
  classPath?: string;
  recordData?: string;
  // SOA record specific fields
  primaryNameServer?: string;
  responsiblePerson?: string;
  serial?: string;
  refresh?: string;
  retry?: string;
  expire?: string;
  minimum?: string;
  useSerialDateScheme?: boolean;
  // FWD record specific fields
  protocol?: string;
  forwarder?: string;
  forwarderPriority?: string;
  dnssecValidation?: boolean;
  proxyType?: string;
  proxyAddress?: string;
  proxyPort?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}

function RecordForm({
  data,
  onChange,
  installedApps,
  isEdit = false,
}: {
  data: RecordFormData;
  onChange: (data: RecordFormData) => void;
  installedApps?: InstalledApp[];
  isEdit?: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getValueLabel = () => {
    switch (data.type) {
      case "A":
        return "IPv4 Address";
      case "AAAA":
        return "IPv6 Address";
      case "CNAME":
        return "Target Host";
      case "NS":
        return "Name Server";
      case "MX":
        return "Mail Server";
      case "TXT":
        return "Text Value";
      case "PTR":
        return "Domain Name";
      case "SRV":
        return "Target Host";
      case "CAA":
        return "CA Domain";
      default:
        return "Value";
    }
  };

  const getValuePlaceholder = () => {
    switch (data.type) {
      case "A":
        return "192.168.1.1";
      case "AAAA":
        return "2001:db8::1";
      case "CNAME":
        return "target.example.com";
      case "NS":
        return "ns1.example.com";
      case "MX":
        return "mail.example.com";
      case "TXT":
        return "v=spf1 include:_spf.google.com ~all";
      case "PTR":
        return "example.com";
      case "SRV":
        return "server.example.com";
      default:
        return "";
    }
  };

  const getTypeDescription = () => {
    switch (data.type) {
      case "A":
        return "Maps a domain to an IPv4 address";
      case "AAAA":
        return "Maps a domain to an IPv6 address";
      case "CNAME":
        return "Creates an alias pointing to another domain";
      case "NS":
        return "Delegates a zone to a name server";
      case "MX":
        return "Specifies mail servers for the domain";
      case "TXT":
        return "Stores text data (SPF, DKIM, verification)";
      case "PTR":
        return "Maps an IP address to a domain name";
      case "SRV":
        return "Specifies service location";
      case "CAA":
        return "Specifies which CAs can issue certificates";
      case "SOA":
        return "Start of Authority record for the zone";
      case "APP":
        return "DNS application record";
      case "FWD":
        return "Conditional forwarder record";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Record Type Selection - More prominent for new records */}
      {!isEdit && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Record Type</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {recordTypes.slice(0, 6).map((type) => (
              <Button
                key={type}
                type="button"
                variant={data.type === type ? "default" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => onChange({ ...data, type })}
              >
                {type}
              </Button>
            ))}
          </div>
          <Select
            value={recordTypes.slice(0, 6).includes(data.type) ? "" : data.type}
            onValueChange={(v) => v && onChange({ ...data, type: v })}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="More types..." />
            </SelectTrigger>
            <SelectContent>
              {recordTypes.slice(6).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getTypeDescription() && (
            <p className="text-xs text-muted-foreground">
              {getTypeDescription()}
            </p>
          )}
        </div>
      )}

      {/* Show type badge for edit mode */}
      {isEdit && (
        <div className="flex items-center gap-3 pb-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {data.type}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {getTypeDescription()}
          </span>
        </div>
      )}

      {/* Primary Fields Section */}
      <div className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Name</Label>
          <Input
            placeholder="@ for zone apex, or subdomain"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="font-mono"
          />
        </div>

        {/* Main Value Field - varies by type */}
        {data.type !== "APP" && data.type !== "SOA" && data.type !== "FWD" && (
          <>
            {/* A/AAAA Records */}
            {(data.type === "A" || data.type === "AAAA") && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{getValueLabel()}</Label>
                <Input
                  placeholder={getValuePlaceholder()}
                  value={data.value}
                  onChange={(e) => onChange({ ...data, value: e.target.value })}
                  className="font-mono"
                />
              </div>
            )}

            {/* CNAME/NS/PTR Records */}
            {(data.type === "CNAME" ||
              data.type === "NS" ||
              data.type === "PTR") && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{getValueLabel()}</Label>
                <Input
                  placeholder={getValuePlaceholder()}
                  value={data.value}
                  onChange={(e) => onChange({ ...data, value: e.target.value })}
                  className="font-mono"
                />
              </div>
            )}

            {/* MX Record */}
            {data.type === "MX" && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2 sm:col-span-3">
                  <Label className="text-sm font-medium">
                    {getValueLabel()}
                  </Label>
                  <Input
                    placeholder={getValuePlaceholder()}
                    value={data.value.split(" ")[1] || ""}
                    onChange={(e) => {
                      const pref = data.value.split(" ")[0] || "10";
                      onChange({
                        ...data,
                        value: `${pref} ${e.target.value}`.trim(),
                      });
                    }}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={data.value.split(" ")[0] || "10"}
                    onChange={(e) => {
                      const exchange = data.value.split(" ")[1] || "";
                      onChange({
                        ...data,
                        value: `${e.target.value} ${exchange}`.trim(),
                      });
                    }}
                  />
                </div>
              </div>
            )}

            {/* TXT Record */}
            {data.type === "TXT" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{getValueLabel()}</Label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono resize-y"
                  placeholder={getValuePlaceholder()}
                  value={data.value}
                  onChange={(e) => onChange({ ...data, value: e.target.value })}
                />
              </div>
            )}

            {/* SRV Record */}
            {data.type === "SRV" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {getValueLabel()}
                  </Label>
                  <Input
                    placeholder={getValuePlaceholder()}
                    value={data.value.split(" ")[3] || ""}
                    onChange={(e) => {
                      const parts = data.value.split(" ");
                      parts[3] = e.target.value;
                      onChange({ ...data, value: parts.join(" ").trim() });
                    }}
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Priority
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={data.value.split(" ")[0] || "0"}
                      onChange={(e) => {
                        const parts = data.value.split(" ");
                        parts[0] = e.target.value;
                        onChange({ ...data, value: parts.join(" ").trim() });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Weight
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={data.value.split(" ")[1] || "0"}
                      onChange={(e) => {
                        const parts = data.value.split(" ");
                        parts[1] = e.target.value;
                        onChange({ ...data, value: parts.join(" ").trim() });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Port
                    </Label>
                    <Input
                      type="number"
                      placeholder="80"
                      value={data.value.split(" ")[2] || ""}
                      onChange={(e) => {
                        const parts = data.value.split(" ");
                        parts[2] = e.target.value;
                        onChange({ ...data, value: parts.join(" ").trim() });
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* CAA Record */}
            {data.type === "CAA" && (
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <div className="space-y-2 sm:col-span-3">
                  <Label className="text-sm font-medium">
                    {getValueLabel()}
                  </Label>
                  <Input
                    placeholder="letsencrypt.org"
                    value={
                      data.value
                        .split(" ")
                        .slice(2)
                        .join(" ")
                        .replace(/^"|"$/g, "") || ""
                    }
                    onChange={(e) => {
                      const parts = data.value.split(" ");
                      onChange({
                        ...data,
                        value:
                          `${parts[0] || "0"} ${parts[1] || "issue"} "${e.target.value}"`.trim(),
                      });
                    }}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Tag</Label>
                  <Select
                    value={data.value.split(" ")[1] || "issue"}
                    onValueChange={(v) => {
                      const parts = data.value.split(" ");
                      parts[1] = v;
                      onChange({ ...data, value: parts.join(" ").trim() });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="issue">issue</SelectItem>
                      <SelectItem value="issuewild">issuewild</SelectItem>
                      <SelectItem value="iodef">iodef</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Flags</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={data.value.split(" ")[0] || "0"}
                    onChange={(e) => {
                      const parts = data.value.split(" ");
                      parts[0] = e.target.value;
                      onChange({ ...data, value: parts.join(" ").trim() });
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* SOA Record Fields */}
        {data.type === "SOA" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Primary Name Server
                </Label>
                <Input
                  placeholder="dns.example.com"
                  value={data.primaryNameServer || ""}
                  onChange={(e) =>
                    onChange({ ...data, primaryNameServer: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Responsible Person
                </Label>
                <Input
                  placeholder="hostmaster.example.com"
                  value={data.responsiblePerson || ""}
                  onChange={(e) =>
                    onChange({ ...data, responsiblePerson: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Serial</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={data.serial || ""}
                  onChange={(e) =>
                    onChange({ ...data, serial: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Refresh</Label>
                <Input
                  type="number"
                  placeholder="900"
                  value={data.refresh || ""}
                  onChange={(e) =>
                    onChange({ ...data, refresh: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Retry</Label>
                <Input
                  type="number"
                  placeholder="300"
                  value={data.retry || ""}
                  onChange={(e) => onChange({ ...data, retry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Expire</Label>
                <Input
                  type="number"
                  placeholder="604800"
                  value={data.expire || ""}
                  onChange={(e) =>
                    onChange({ ...data, expire: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Minimum TTL
                </Label>
                <Input
                  type="number"
                  placeholder="86400"
                  value={data.minimum || ""}
                  onChange={(e) =>
                    onChange({ ...data, minimum: e.target.value })
                  }
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useSerialDateScheme"
                    checked={data.useSerialDateScheme || false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...data,
                        useSerialDateScheme: checked === true,
                      })
                    }
                  />
                  <Label
                    htmlFor="useSerialDateScheme"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Use date scheme
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FWD Record Fields */}
        {data.type === "FWD" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Forwarder Address</Label>
              <Input
                placeholder="8.8.8.8 or dns.google"
                value={data.forwarder || ""}
                onChange={(e) =>
                  onChange({ ...data, forwarder: e.target.value })
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                IP address, domain name, or "this-server"
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Protocol
                </Label>
                <Select
                  value={data.protocol || "Udp"}
                  onValueChange={(v) => onChange({ ...data, protocol: v })}
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
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Priority
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={data.forwarderPriority || "0"}
                  onChange={(e) =>
                    onChange({ ...data, forwarderPriority: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dnssecValidation"
                checked={data.dnssecValidation || false}
                onCheckedChange={(checked) =>
                  onChange({ ...data, dnssecValidation: checked === true })
                }
              />
              <Label
                htmlFor="dnssecValidation"
                className="text-sm font-normal cursor-pointer"
              >
                Enable DNSSEC validation
              </Label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Proxy</Label>
              <Select
                value={data.proxyType || "DefaultProxy"}
                onValueChange={(v) => onChange({ ...data, proxyType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NoProxy">No Proxy</SelectItem>
                  <SelectItem value="DefaultProxy">Default Proxy</SelectItem>
                  <SelectItem value="Http">HTTP Proxy</SelectItem>
                  <SelectItem value="Socks5">SOCKS5 Proxy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(data.proxyType === "Http" || data.proxyType === "Socks5") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Proxy Address
                  </Label>
                  <Input
                    placeholder="proxy.example.com"
                    value={data.proxyAddress || ""}
                    onChange={(e) =>
                      onChange({ ...data, proxyAddress: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Proxy Port
                  </Label>
                  <Input
                    type="number"
                    placeholder="8080"
                    value={data.proxyPort || ""}
                    onChange={(e) =>
                      onChange({ ...data, proxyPort: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Username
                  </Label>
                  <Input
                    placeholder="Optional"
                    value={data.proxyUsername || ""}
                    onChange={(e) =>
                      onChange({ ...data, proxyUsername: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    type="password"
                    placeholder="Optional"
                    value={data.proxyPassword || ""}
                    onChange={(e) =>
                      onChange({ ...data, proxyPassword: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* APP Record Fields */}
        {data.type === "APP" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">App Name</Label>
                {installedApps && installedApps.length > 0 ? (
                  <Select
                    value={data.appName || ""}
                    onValueChange={(v) => {
                      const app = installedApps.find((a) => a.name === v);
                      onChange({
                        ...data,
                        appName: v,
                        classPath:
                          app?.dnsApps[0]?.classPath || data.classPath || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an app" />
                    </SelectTrigger>
                    <SelectContent>
                      {installedApps.map((app) => (
                        <SelectItem key={app.name} value={app.name}>
                          {app.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="App name"
                    value={data.appName || ""}
                    onChange={(e) =>
                      onChange({ ...data, appName: e.target.value })
                    }
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Class Path</Label>
                {installedApps && data.appName ? (
                  <Select
                    value={data.classPath || ""}
                    onValueChange={(v) => onChange({ ...data, classPath: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class path" />
                    </SelectTrigger>
                    <SelectContent>
                      {installedApps
                        .find((app) => app.name === data.appName)
                        ?.dnsApps.map((dnsApp) => (
                          <SelectItem
                            key={dnsApp.classPath}
                            value={dnsApp.classPath}
                          >
                            {dnsApp.classPath}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="App.ClassName"
                    value={data.classPath || ""}
                    onChange={(e) =>
                      onChange({ ...data, classPath: e.target.value })
                    }
                    className="font-mono"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Record Data (optional)
              </Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono resize-y"
                placeholder="Optional app-specific data"
                value={data.recordData || ""}
                onChange={(e) =>
                  onChange({ ...data, recordData: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {/* NS Glue Records */}
        {data.type === "NS" && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Glue Addresses (optional)
            </Label>
            <Input
              placeholder="192.168.1.1, 2001:db8::1"
              value={data.comments}
              onChange={(e) => onChange({ ...data, comments: e.target.value })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Required if name server is within this zone
            </p>
          </div>
        )}

        {/* PTR Options for A/AAAA records */}
        {(data.type === "A" || data.type === "AAAA") && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ptr"
                checked={data.ptr}
                onCheckedChange={(checked) =>
                  onChange({ ...data, ptr: checked === true })
                }
              />
              <Label
                htmlFor="ptr"
                className="text-sm font-normal cursor-pointer"
              >
                Create PTR record
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createPtrZone"
                checked={data.createPtrZone}
                onCheckedChange={(checked) =>
                  onChange({ ...data, createPtrZone: checked === true })
                }
              />
              <Label
                htmlFor="createPtrZone"
                className="text-sm font-normal cursor-pointer"
              >
                Create reverse zone
              </Label>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options - Collapsible */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            Advanced Options
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                TTL (seconds)
              </Label>
              <Input
                type="number"
                value={data.ttl}
                onChange={(e) => onChange({ ...data, ttl: e.target.value })}
                placeholder="3600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Auto-expire (seconds)
              </Label>
              <Input
                type="number"
                value={data.expiryTtl}
                onChange={(e) =>
                  onChange({ ...data, expiryTtl: e.target.value })
                }
                placeholder="0 = never"
              />
            </div>
          </div>
          {data.type !== "NS" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Comments</Label>
              <Input
                placeholder="Optional notes about this record"
                value={data.comments}
                onChange={(e) =>
                  onChange({ ...data, comments: e.target.value })
                }
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Zone Records View Component
function ZoneRecordsView({
  zone,
  onBack,
  initialRecordName,
  initialRecordType,
  initialRecordValue,
}: {
  zone: Zone;
  onBack: () => void;
  initialRecordName?: string;
  initialRecordType?: string;
  initialRecordValue?: string;
}) {
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newRecord, setNewRecord] = useState<RecordFormData>({
    type: "A",
    name: "",
    ttl: "3600",
    value: "",
    comments: "",
    expiryTtl: "0",
    ptr: false,
    createPtrZone: false,
  });
  const [editRecord, setEditRecord] = useState<
    (RecordFormData & { original: DnsRecord }) | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DnsRecord | null>(null);
  const [filter, setFilter] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>("all");

  const { data, isLoading, refetch } = useApi(
    () => getZoneRecords(zone.name, zone.name, true),
    [zone.name],
  );
  const records = data?.records ?? [];

  // Fetch installed apps for APP records
  const { data: appsData } = useApi(() => listApps(), []);
  const installedApps = appsData?.apps ?? [];

  // Track if we've handled initial URL params for edit
  const [initialEditHandled, setInitialEditHandled] = useState(false);

  // Open edit dialog if URL has record params (only once when records load)
  useEffect(() => {
    if (initialEditHandled) return;
    if (!initialRecordName || !initialRecordType || !initialRecordValue) return;
    if (records.length === 0) return;

    const decodedValue = decodeURIComponent(initialRecordValue);
    const record = records.find(
      (r) =>
        r.name === decodeURIComponent(initialRecordName) &&
        r.type === initialRecordType &&
        formatRData(r) === decodedValue,
    );

    if (!record) {
      setInitialEditHandled(true);
      return;
    }

    const value = formatRData(record);
    const editData: RecordFormData & { original: DnsRecord } = {
      original: record,
      type: record.type,
      name: record.name,
      ttl: record.ttl.toString(),
      value,
      comments: record.comments || "",
      expiryTtl: record.expiryTtl?.toString() || "0",
      ptr: false,
      createPtrZone: false,
    };

    if (record.type === "APP") {
      editData.appName = String(record.rData.appName || "");
      editData.classPath = String(record.rData.classPath || "");
      editData.recordData = String(record.rData.recordData || "");
    }

    if (record.type === "SOA") {
      editData.primaryNameServer = String(record.rData.primaryNameServer || "");
      editData.responsiblePerson = String(record.rData.responsiblePerson || "");
      editData.serial = String(record.rData.serial || "");
      editData.refresh = String(record.rData.refresh || "");
      editData.retry = String(record.rData.retry || "");
      editData.expire = String(record.rData.expire || "");
      editData.minimum = String(record.rData.minimum || "");
      editData.useSerialDateScheme = Boolean(record.rData.useSerialDateScheme);
    }

    if (record.type === "FWD") {
      editData.protocol = String(record.rData.protocol || "Udp");
      editData.forwarder = String(record.rData.forwarder || "");
      editData.forwarderPriority = String(record.rData.forwarderPriority || "0");
      editData.dnssecValidation = Boolean(record.rData.dnssecValidation);
      editData.proxyType = String(record.rData.proxyType || "DefaultProxy");
      editData.proxyAddress = String(record.rData.proxyAddress || "");
      editData.proxyPort = String(record.rData.proxyPort || "");
      editData.proxyUsername = String(record.rData.proxyUsername || "");
      editData.proxyPassword = String(record.rData.proxyPassword || "");
    }

    setInitialEditHandled(true);
    setEditRecord(editData);
    setIsEditOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records.length, initialEditHandled]);

  const filteredRecords = records.filter((record) => {
    const matchesText =
      record.name.toLowerCase().includes(filter.toLowerCase()) ||
      record.type.toLowerCase().includes(filter.toLowerCase());
    const matchesType =
      recordTypeFilter === "all" || record.type === recordTypeFilter;
    return matchesText && matchesType;
  });

  // Get unique record types from current records for filter dropdown
  const availableRecordTypes = [...new Set(records.map((r) => r.type))].sort();

  const handleAddRecord = async () => {
    // Validation: Different record types need different fields
    if (!newRecord.name.trim()) return;
    if (newRecord.type === "APP") {
      if (!newRecord.appName?.trim() || !newRecord.classPath?.trim()) return;
    } else if (newRecord.type === "SOA") {
      if (
        !newRecord.primaryNameServer?.trim() ||
        !newRecord.responsiblePerson?.trim()
      )
        return;
    } else if (newRecord.type === "FWD") {
      if (!newRecord.forwarder?.trim()) return;
    } else {
      if (!newRecord.value.trim()) return;
    }

    setIsSubmitting(true);

    // Build rdata based on record type
    let rdata: Record<string, string> = {};
    switch (newRecord.type) {
      case "A":
      case "AAAA":
        rdata = { ipAddress: newRecord.value };
        break;
      case "CNAME":
        rdata = { cname: newRecord.value };
        break;
      case "NS":
        rdata = { nameServer: newRecord.value };
        break;
      case "MX": {
        const [pref, exchange] = newRecord.value.split(" ");
        rdata = {
          preference: pref || "10",
          exchange: exchange || newRecord.value,
        };
        break;
      }
      case "TXT":
        rdata = { text: newRecord.value };
        break;
      case "PTR":
        rdata = { ptrName: newRecord.value };
        break;
      case "APP":
        rdata = {
          appName: newRecord.appName || "",
          classPath: newRecord.classPath || "",
        };
        if (newRecord.recordData) {
          rdata.recordData = newRecord.recordData;
        }
        break;
      case "SOA":
        rdata = {
          primaryNameServer: newRecord.primaryNameServer || "",
          responsiblePerson: newRecord.responsiblePerson || "",
          serial: newRecord.serial || "1",
          refresh: newRecord.refresh || "900",
          retry: newRecord.retry || "300",
          expire: newRecord.expire || "604800",
          minimum: newRecord.minimum || "86400",
        };
        if (newRecord.useSerialDateScheme) {
          rdata.useSerialDateScheme = "true";
        }
        break;
      case "FWD":
        rdata = {
          protocol: newRecord.protocol || "Udp",
          forwarder: newRecord.forwarder || "",
        };
        if (newRecord.forwarderPriority) {
          rdata.forwarderPriority = newRecord.forwarderPriority;
        }
        if (newRecord.dnssecValidation) {
          rdata.dnssecValidation = "true";
        }
        if (newRecord.proxyType && newRecord.proxyType !== "DefaultProxy") {
          rdata.proxyType = newRecord.proxyType;
        }
        if (newRecord.proxyAddress) {
          rdata.proxyAddress = newRecord.proxyAddress;
        }
        if (newRecord.proxyPort) {
          rdata.proxyPort = newRecord.proxyPort;
        }
        if (newRecord.proxyUsername) {
          rdata.proxyUsername = newRecord.proxyUsername;
        }
        if (newRecord.proxyPassword) {
          rdata.proxyPassword = newRecord.proxyPassword;
        }
        break;
      default:
        rdata = { value: newRecord.value };
    }

    const domain = newRecord.name.endsWith(zone.name)
      ? newRecord.name
      : newRecord.name === "@"
        ? zone.name
        : `${newRecord.name}.${zone.name}`;

    const response = await addRecord(
      zone.name,
      domain,
      newRecord.type,
      parseInt(newRecord.ttl),
      rdata,
      {
        comments: newRecord.comments,
        expiryTtl: parseInt(newRecord.expiryTtl),
        ptr: newRecord.ptr,
        createPtrZone: newRecord.createPtrZone,
      },
    );

    if (response.status === "ok") {
      toast.success("Record added successfully");
      setNewRecord({
        type: "A",
        name: "",
        ttl: "3600",
        value: "",
        comments: "",
        expiryTtl: "0",
        ptr: false,
        createPtrZone: false,
      });
      setIsAddOpen(false);
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to add record");
    }
    setIsSubmitting(false);
  };

  const handleEditClick = (record: DnsRecord) => {
    const value = formatRData(record);
    const editData: RecordFormData & { original: DnsRecord } = {
      original: record,
      type: record.type,
      name: record.name,
      ttl: record.ttl.toString(),
      value,
      comments: record.comments || "",
      expiryTtl: record.expiryTtl?.toString() || "0",
      ptr: false,
      createPtrZone: false,
    };

    // Add APP-specific fields
    if (record.type === "APP") {
      editData.appName = String(record.rData.appName || "");
      editData.classPath = String(record.rData.classPath || "");
      editData.recordData = String(record.rData.recordData || "");
    }

    // Add SOA-specific fields
    if (record.type === "SOA") {
      editData.primaryNameServer = String(record.rData.primaryNameServer || "");
      editData.responsiblePerson = String(record.rData.responsiblePerson || "");
      editData.serial = String(record.rData.serial || "");
      editData.refresh = String(record.rData.refresh || "");
      editData.retry = String(record.rData.retry || "");
      editData.expire = String(record.rData.expire || "");
      editData.minimum = String(record.rData.minimum || "");
      editData.useSerialDateScheme = Boolean(record.rData.useSerialDateScheme);
    }

    // Add FWD-specific fields
    if (record.type === "FWD") {
      editData.protocol = String(record.rData.protocol || "Udp");
      editData.forwarder = String(record.rData.forwarder || "");
      editData.forwarderPriority = String(
        record.rData.forwarderPriority || "0",
      );
      editData.dnssecValidation = Boolean(record.rData.dnssecValidation);
      editData.proxyType = String(record.rData.proxyType || "DefaultProxy");
      editData.proxyAddress = String(record.rData.proxyAddress || "");
      editData.proxyPort = String(record.rData.proxyPort || "");
      editData.proxyUsername = String(record.rData.proxyUsername || "");
      editData.proxyPassword = String(record.rData.proxyPassword || "");
    }

    setEditRecord(editData);
    setIsEditOpen(true);
    // Update URL to reflect editing state - include value to uniquely identify the record
    navigate(
      `/zones/${encodeURIComponent(zone.name)}/${encodeURIComponent(record.name)}/${record.type}/${encodeURIComponent(value)}/edit`,
    );
  };

  const handleUpdateRecord = async () => {
    if (!editRecord) return;

    setIsSubmitting(true);

    // First delete the old record
    const oldRdata: Record<string, string> = {};
    switch (editRecord.original.type) {
      case "A":
      case "AAAA":
        oldRdata.ipAddress = String(editRecord.original.rData.ipAddress || "");
        break;
      case "CNAME":
        oldRdata.cname = String(editRecord.original.rData.cname || "");
        break;
      case "NS":
        oldRdata.nameServer = String(
          editRecord.original.rData.nameServer || "",
        );
        break;
      case "MX":
        oldRdata.preference = String(
          editRecord.original.rData.preference || "",
        );
        oldRdata.exchange = String(editRecord.original.rData.exchange || "");
        break;
      case "TXT":
        oldRdata.text = String(editRecord.original.rData.text || "");
        break;
      case "APP":
        oldRdata.appName = String(editRecord.original.rData.appName || "");
        oldRdata.classPath = String(editRecord.original.rData.classPath || "");
        if (editRecord.original.rData.recordData) {
          oldRdata.recordData = String(editRecord.original.rData.recordData);
        }
        break;
      case "SOA":
        oldRdata.primaryNameServer = String(
          editRecord.original.rData.primaryNameServer || "",
        );
        oldRdata.responsiblePerson = String(
          editRecord.original.rData.responsiblePerson || "",
        );
        oldRdata.serial = String(editRecord.original.rData.serial || "");
        oldRdata.refresh = String(editRecord.original.rData.refresh || "");
        oldRdata.retry = String(editRecord.original.rData.retry || "");
        oldRdata.expire = String(editRecord.original.rData.expire || "");
        oldRdata.minimum = String(editRecord.original.rData.minimum || "");
        break;
      case "FWD":
        oldRdata.protocol = String(editRecord.original.rData.protocol || "Udp");
        oldRdata.forwarder = String(editRecord.original.rData.forwarder || "");
        break;
    }

    const deleteResponse = await deleteRecord(
      zone.name,
      editRecord.original.name,
      editRecord.original.type,
      oldRdata,
    );

    if (deleteResponse.status !== "ok") {
      toast.error(deleteResponse.errorMessage || "Failed to update record");
      setIsSubmitting(false);
      return;
    }

    // Then add the new record
    let rdata: Record<string, string> = {};
    switch (editRecord.type) {
      case "A":
      case "AAAA":
        rdata = { ipAddress: editRecord.value };
        break;
      case "CNAME":
        rdata = { cname: editRecord.value };
        break;
      case "NS":
        rdata = { nameServer: editRecord.value };
        break;
      case "MX": {
        const [pref, exchange] = editRecord.value.split(" ");
        rdata = {
          preference: pref || "10",
          exchange: exchange || editRecord.value,
        };
        break;
      }
      case "TXT":
        rdata = { text: editRecord.value };
        break;
      case "PTR":
        rdata = { ptrName: editRecord.value };
        break;
      case "APP":
        rdata = {
          appName: editRecord.appName || "",
          classPath: editRecord.classPath || "",
        };
        if (editRecord.recordData) {
          rdata.recordData = editRecord.recordData;
        }
        break;
      case "SOA":
        rdata = {
          primaryNameServer: editRecord.primaryNameServer || "",
          responsiblePerson: editRecord.responsiblePerson || "",
          serial: editRecord.serial || "1",
          refresh: editRecord.refresh || "900",
          retry: editRecord.retry || "300",
          expire: editRecord.expire || "604800",
          minimum: editRecord.minimum || "86400",
        };
        if (editRecord.useSerialDateScheme) {
          rdata.useSerialDateScheme = "true";
        }
        break;
      case "FWD":
        rdata = {
          protocol: editRecord.protocol || "Udp",
          forwarder: editRecord.forwarder || "",
        };
        if (editRecord.forwarderPriority) {
          rdata.forwarderPriority = editRecord.forwarderPriority;
        }
        if (editRecord.dnssecValidation) {
          rdata.dnssecValidation = "true";
        }
        if (editRecord.proxyType && editRecord.proxyType !== "DefaultProxy") {
          rdata.proxyType = editRecord.proxyType;
        }
        if (editRecord.proxyAddress) {
          rdata.proxyAddress = editRecord.proxyAddress;
        }
        if (editRecord.proxyPort) {
          rdata.proxyPort = editRecord.proxyPort;
        }
        if (editRecord.proxyUsername) {
          rdata.proxyUsername = editRecord.proxyUsername;
        }
        if (editRecord.proxyPassword) {
          rdata.proxyPassword = editRecord.proxyPassword;
        }
        break;
      default:
        rdata = { value: editRecord.value };
    }

    const addResponse = await addRecord(
      zone.name,
      editRecord.name,
      editRecord.type,
      parseInt(editRecord.ttl),
      rdata,
      {
        comments: editRecord.comments,
        expiryTtl: parseInt(editRecord.expiryTtl),
        ptr: editRecord.ptr,
        createPtrZone: editRecord.createPtrZone,
      },
    );

    if (addResponse.status === "ok") {
      toast.success("Record updated successfully");
      setEditRecord(null);
      setIsEditOpen(false);
      navigate(`/zones/${encodeURIComponent(zone.name)}`);
      refetch();
    } else {
      toast.error(addResponse.errorMessage || "Failed to update record");
    }
    setIsSubmitting(false);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    const rdata: Record<string, string> = {};
    switch (recordToDelete.type) {
      case "A":
      case "AAAA":
        rdata.ipAddress = String(recordToDelete.rData.ipAddress || "");
        break;
      case "CNAME":
        rdata.cname = String(recordToDelete.rData.cname || "");
        break;
      case "NS":
        rdata.nameServer = String(recordToDelete.rData.nameServer || "");
        break;
      case "MX":
        rdata.preference = String(recordToDelete.rData.preference || "");
        rdata.exchange = String(recordToDelete.rData.exchange || "");
        break;
      case "TXT":
        rdata.text = String(recordToDelete.rData.text || "");
        break;
      case "APP":
        rdata.appName = String(recordToDelete.rData.appName || "");
        rdata.classPath = String(recordToDelete.rData.classPath || "");
        if (recordToDelete.rData.recordData) {
          rdata.recordData = String(recordToDelete.rData.recordData);
        }
        break;
      case "SOA":
        rdata.primaryNameServer = String(
          recordToDelete.rData.primaryNameServer || "",
        );
        rdata.responsiblePerson = String(
          recordToDelete.rData.responsiblePerson || "",
        );
        rdata.serial = String(recordToDelete.rData.serial || "");
        rdata.refresh = String(recordToDelete.rData.refresh || "");
        rdata.retry = String(recordToDelete.rData.retry || "");
        rdata.expire = String(recordToDelete.rData.expire || "");
        rdata.minimum = String(recordToDelete.rData.minimum || "");
        break;
      case "FWD":
        rdata.protocol = String(recordToDelete.rData.protocol || "Udp");
        rdata.forwarder = String(recordToDelete.rData.forwarder || "");
        break;
    }

    const response = await deleteRecord(
      zone.name,
      recordToDelete.name,
      recordToDelete.type,
      rdata,
    );

    if (response.status === "ok") {
      toast.success("Record deleted");
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to delete record");
    }
    setRecordToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0 mt-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold font-mono truncate">
            {zone.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <ZoneTypeBadge type={zone.type} />
            <ZoneStatusBadge zone={zone} />
            {zone.dnssecStatus && zone.dnssecStatus !== "Unsigned" && (
              <Badge
                variant="outline"
                className="text-xs hidden sm:inline-flex"
              >
                DNSSEC: {zone.dnssecStatus}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {records.length} {records.length === 1 ? "record" : "records"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Record</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0"
            >
              <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <DialogTitle>Add DNS Record</DialogTitle>
                    <DialogDescription>
                      Add a new DNS record to {zone.name}
                    </DialogDescription>
                  </div>
                  <DialogClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 -mt-1 -mr-2"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </DialogClose>
                </div>
              </DialogHeader>
              <div className="overflow-y-auto px-6 flex-1">
                <RecordForm
                  data={newRecord}
                  onChange={setNewRecord}
                  installedApps={installedApps}
                />
              </div>
              <DialogFooter className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRecord}
                  disabled={
                    isSubmitting ||
                    !newRecord.name ||
                    (newRecord.type === "APP"
                      ? !newRecord.appName || !newRecord.classPath
                      : newRecord.type === "SOA"
                        ? !newRecord.primaryNameServer ||
                          !newRecord.responsiblePerson
                        : newRecord.type === "FWD"
                          ? !newRecord.forwarder
                          : !newRecord.value)
                  }
                >
                  {isSubmitting ? "Adding..." : "Add Record"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Record Dialog */}
        <Dialog
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) {
              navigate(`/zones/${encodeURIComponent(zone.name)}`);
            }
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0"
          >
            <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <DialogTitle>Edit DNS Record</DialogTitle>
                  <DialogDescription>
                    Update the DNS record for {zone.name}
                  </DialogDescription>
                </div>
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 -mt-1 -mr-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            </DialogHeader>
            <div className="overflow-y-auto px-6 flex-1">
              {editRecord && (
                <RecordForm
                  data={editRecord}
                  onChange={(updated) =>
                    setEditRecord({ ...updated, original: editRecord.original })
                  }
                  installedApps={installedApps}
                  isEdit
                />
              )}
            </div>
            <DialogFooter className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t flex-col sm:flex-row gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  if (editRecord) {
                    setRecordToDelete(editRecord.original);
                    setIsEditOpen(false);
                  }
                }}
                className="sm:mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Record
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    navigate(`/zones/${encodeURIComponent(zone.name)}`);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateRecord}
                  disabled={
                    isSubmitting ||
                    !editRecord?.name ||
                    (editRecord?.type === "APP"
                      ? !editRecord?.appName || !editRecord?.classPath
                      : editRecord?.type === "SOA"
                        ? !editRecord?.primaryNameServer ||
                          !editRecord?.responsiblePerson
                        : editRecord?.type === "FWD"
                          ? !editRecord?.forwarder
                          : !editRecord?.value)
                  }
                >
                  {isSubmitting ? "Updating..." : "Update Record"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter records..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        {availableRecordTypes.length > 1 && (
          <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableRecordTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Records List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {filter ? "No records match your filter" : "No records found"}
            </div>
          ) : (
            <div className="divide-y">
              {filteredRecords.map((record, idx) => (
                <div
                  key={`${record.name}-${record.type}-${idx}`}
                  className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors group cursor-pointer"
                  onClick={() => handleEditClick(record)}
                >
                  <Badge
                    variant="outline"
                    className="w-12 sm:w-14 justify-center font-mono text-xs shrink-0"
                  >
                    {record.type}
                  </Badge>
                  <span
                    className="font-mono text-sm min-w-0 sm:min-w-[200px] truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CopyableText text={record.name} showIcon={false} />
                  </span>
                  <span
                    className="font-mono text-sm text-muted-foreground flex-1 truncate hidden sm:block"
                    title={formatRData(record)}
                  >
                    {formatRData(record)}
                  </span>
                  <span className="text-xs text-muted-foreground w-12 sm:w-16 text-right shrink-0">
                    {record.ttl}s
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!recordToDelete}
        onOpenChange={() => setRecordToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {recordToDelete?.type} record
              for {recordToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Main Zones List Component
export default function Zones() {
  const { zoneName, recordName, recordType, recordValue } = useParams<{
    zoneName?: string;
    recordName?: string;
    recordType?: string;
    recordValue?: string;
  }>();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneType, setNewZoneType] = useState("Primary");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState("");
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);

  const { data, isLoading, error, refetch } = useApi(() => listZones(), []);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "disabled"
  >("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const zones = data?.zones ?? [];
  const selectedZone = zoneName
    ? zones.find((z) => z.name === zoneName) || null
    : null;
  const filteredZones = zones.filter((zone) => {
    const matchesText = zone.name.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !zone.disabled) ||
      (statusFilter === "disabled" && zone.disabled);
    const matchesType = typeFilter === "all" || zone.type === typeFilter;
    return matchesText && matchesStatus && matchesType;
  });

  const handleCreate = async () => {
    if (!newZoneName.trim()) return;

    setIsSubmitting(true);
    const response = await createZone(newZoneName.trim(), newZoneType);

    if (response.status === "ok") {
      toast.success(`Zone "${newZoneName}" created`);
      setNewZoneName("");
      setIsCreateOpen(false);
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to create zone");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!zoneToDelete) return;

    const response = await deleteZone(zoneToDelete.name);
    if (response.status === "ok") {
      toast.success(`Zone "${zoneToDelete.name}" deleted`);
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to delete zone");
    }
    setZoneToDelete(null);
  };

  // Toggle function available for future use (e.g., context menu)
  const _handleToggle = async (zone: Zone) => {
    const action = zone.disabled ? enableZone : disableZone;
    const response = await action(zone.name);

    if (response.status === "ok") {
      toast.success(
        `Zone "${zone.name}" ${zone.disabled ? "enabled" : "disabled"}`,
      );
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to update zone");
    }
  };
  void _handleToggle;

  // Show zone detail view if a zone is selected
  if (selectedZone) {
    return (
      <ZoneRecordsView
        zone={selectedZone}
        onBack={() => navigate("/zones")}
        initialRecordName={recordName}
        initialRecordType={recordType}
        initialRecordValue={recordValue}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Zones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {zones.length} zones configured
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="sm:size-default shrink-0">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Zone</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Zone</DialogTitle>
              <DialogDescription>
                Add a new DNS zone to your server.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Zone Name</Label>
                <Input
                  placeholder="example.com"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Zone Type</Label>
                <Select value={newZoneType} onValueChange={setNewZoneType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {zoneTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !newZoneName.trim()}
              >
                {isSubmitting ? "Creating..." : "Create Zone"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search zones..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1 sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {zoneTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label.replace(" Zone", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v: "all" | "active" | "disabled") =>
              setStatusFilter(v)
            }
          >
            <SelectTrigger className="flex-1 sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Zones List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <div className="flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : filteredZones.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {filter
                ? "No zones match your search"
                : "No zones found. Create your first zone to get started."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredZones.map((zone) => (
                <div
                  key={zone.name}
                  className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/zones/${zone.name}`)}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm font-medium block truncate">
                      {zone.name}
                    </span>
                    <div className="flex items-center gap-2 mt-1 sm:hidden">
                      <ZoneTypeBadge type={zone.type} />
                      <ZoneStatusBadge zone={zone} />
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <ZoneTypeBadge type={zone.type} />
                    <ZoneStatusBadge zone={zone} />
                    {zone.dnssecStatus && zone.dnssecStatus !== "Unsigned" && (
                      <Badge variant="outline" className="text-xs">
                        DNSSEC: {zone.dnssecStatus}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setZoneToDelete(zone)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Zone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!zoneToDelete}
        onOpenChange={() => setZoneToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{zoneToDelete?.name}"? This will
              permanently delete all records in this zone. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Zone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
