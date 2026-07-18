import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ArrowLeft,
  ArrowLeftRight,
  Trash2,
  RefreshCw,
  RotateCw,
  Settings2,
  X,
  MoreVertical,
  Power,
  Download,
  Upload,
  Copy,
  KeyRound,
  ShieldCheck,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApi } from "@/hooks/useApi";
import { Switch } from "@/components/ui/switch";
import {
  listZones,
  createZone,
  deleteZone,
  enableZone,
  disableZone,
  getZoneRecords,
  addRecord,
  deleteRecord,
  updateRecord,
  exportZone,
  resyncZone,
} from "@/api/dns";
import { listApps, type InstalledApp } from "@/api/apps";
import { saveBlob } from "@/lib/utils";
import { ZoneOptionsDialog } from "@/components/zones/ZoneOptionsDialog";
import { ZonePermissionsDialog } from "@/components/zones/ZonePermissionsDialog";
import {
  ZoneCloneDialog,
  ZoneConvertDialog,
  ZoneImportDialog,
} from "@/components/zones/ZoneToolsDialogs";
import { DnssecDialog } from "@/components/zones/DnssecDialog";
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
  "ANAME",
  "DS",
  "SSHFP",
  "TLSA",
  "SVCB",
  "HTTPS",
  "URI",
  "NAPTR",
  "APP",
  "FWD",
];

const DS_ALGORITHMS = [
  "RSAMD5",
  "DSA",
  "RSASHA1",
  "DSA-NSEC3-SHA1",
  "RSASHA1-NSEC3-SHA1",
  "RSASHA256",
  "RSASHA512",
  "ECC-GOST",
  "ECDSAP256SHA256",
  "ECDSAP384SHA384",
  "ED25519",
  "ED448",
];
const DS_DIGEST_TYPES = ["SHA1", "SHA256", "SHA384", "GOST-R-34-11-94"];
const SSHFP_ALGORITHMS = ["RSA", "DSA", "ECDSA", "Ed25519", "Ed448"];
const SSHFP_FINGERPRINT_TYPES = ["SHA1", "SHA256"];
const TLSA_CERTIFICATE_USAGES = ["PKIX-TA", "PKIX-EE", "DANE-TA", "DANE-EE"];
const TLSA_SELECTORS = ["Cert", "SPKI"];
const TLSA_MATCHING_TYPES = ["Full", "SHA2-256", "SHA2-512"];

// Zone types that support each management action.
const RESYNC_TYPES = new Set<Zone["type"]>([
  "Secondary",
  "Stub",
  "SecondaryForwarder",
  "SecondaryCatalog",
]);
const IMPORT_TYPES = new Set<Zone["type"]>(["Primary", "Forwarder"]);
const CLONE_TYPES = new Set<Zone["type"]>(["Primary", "Forwarder"]);
const CONVERT_TYPES = new Set<Zone["type"]>([
  "Primary",
  "Secondary",
  "Forwarder",
]);

// Shared handlers for the zone action menus rendered in both the zones list
// and the zone detail header.
interface ZoneActions {
  onOptions: (zone: Zone) => void;
  onPermissions: (zone: Zone) => void;
  onDnssec: (zone: Zone) => void;
  onImport: (zone: Zone) => void;
  onExport: (zone: Zone) => void;
  onClone: (zone: Zone) => void;
  onConvert: (zone: Zone) => void;
  onResync: (zone: Zone) => void;
}

function ZoneActionMenuItems({
  zone,
  actions,
  compact = false,
}: {
  zone: Zone;
  actions: ZoneActions;
  compact?: boolean;
}) {
  if (zone.internal) return null;
  return (
    <>
      <DropdownMenuItem onClick={() => actions.onOptions(zone)}>
        <Settings2 className="h-4 w-4 mr-2" />
        Zone Settings
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => actions.onPermissions(zone)}>
        <KeyRound className="h-4 w-4 mr-2" />
        Permissions
      </DropdownMenuItem>
      {zone.type === "Primary" && (
        <DropdownMenuItem onClick={() => actions.onDnssec(zone)}>
          <ShieldCheck className="h-4 w-4 mr-2" />
          DNSSEC
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      {!compact && IMPORT_TYPES.has(zone.type) && (
        <DropdownMenuItem onClick={() => actions.onImport(zone)}>
          <Upload className="h-4 w-4 mr-2" />
          Import Zone File
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => actions.onExport(zone)}>
        <Download className="h-4 w-4 mr-2" />
        Export Zone File
      </DropdownMenuItem>
      {CLONE_TYPES.has(zone.type) && (
        <DropdownMenuItem onClick={() => actions.onClone(zone)}>
          <Copy className="h-4 w-4 mr-2" />
          Clone Zone
        </DropdownMenuItem>
      )}
      {!compact && CONVERT_TYPES.has(zone.type) && (
        <DropdownMenuItem onClick={() => actions.onConvert(zone)}>
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Convert Zone Type
        </DropdownMenuItem>
      )}
      {RESYNC_TYPES.has(zone.type) && (
        <DropdownMenuItem onClick={() => actions.onResync(zone)}>
          <RotateCw className="h-4 w-4 mr-2" />
          Resync Zone
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
    </>
  );
}

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

// Server enums serialize with underscores where the API's request parameters
// expect hyphens (PKIX_TA vs PKIX-TA, SHA2_256 vs SHA2-256); normalize on
// read so values round-trip through the form selects and delete/update calls.
function enumToDashed(value: unknown, fallback = ""): string {
  return String(value ?? "").replace(/_/g, "-") || fallback;
}

// rData carries svcParams as an object; the API's svcParams request parameter
// wants a pipe-separated key|value list ("alpn|h2,h3|port|443").
function svcParamsToPipe(params: unknown): string {
  if (!params || typeof params !== "object") return "";
  return Object.entries(params as Record<string, unknown>)
    .flatMap(([key, value]) => [key, String(value)])
    .join("|");
}

function formatSvcParams(params: unknown): string {
  if (!params || typeof params !== "object") return "";
  return Object.entries(params as Record<string, unknown>)
    .map(([key, value]) => (value === "" ? key : `${key}=${value}`))
    .join(" ");
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
    case "ANAME":
      return String(rData.aname || "");
    case "DS":
      return `${rData.keyTag ?? 0} ${enumToDashed(rData.algorithm)} ${enumToDashed(rData.digestType)} ${rData.digest || ""}`;
    case "SSHFP":
      return `${enumToDashed(rData.algorithm)} ${enumToDashed(rData.fingerprintType)} ${rData.fingerprint || ""}`;
    case "TLSA":
      return `${enumToDashed(rData.certificateUsage)} ${enumToDashed(rData.selector)} ${enumToDashed(rData.matchingType)} ${rData.certificateAssociationData || ""}`;
    case "SVCB":
    case "HTTPS": {
      const params = formatSvcParams(rData.svcParams);
      return `${rData.svcPriority ?? 0} ${rData.svcTargetName || "."}${params ? ` ${params}` : ""}`;
    }
    case "URI":
      return `${rData.priority ?? 0} ${rData.weight ?? 0} ${rData.uri || ""}`;
    case "NAPTR":
      return `${rData.order ?? 0} ${rData.preference ?? 0} "${rData.flags || ""}" "${rData.services || ""}" "${rData.regexp || ""}" ${rData.replacement || "."}`;
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
  // Edit-only: maps to the record's disabled flag via records/update.
  disabled?: boolean;
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
  // DS record specific fields
  keyTag?: string;
  algorithm?: string;
  digestType?: string;
  digest?: string;
  // SSHFP record specific fields
  sshfpAlgorithm?: string;
  sshfpFingerprintType?: string;
  sshfpFingerprint?: string;
  // TLSA record specific fields
  tlsaCertificateUsage?: string;
  tlsaSelector?: string;
  tlsaMatchingType?: string;
  tlsaCertificateAssociationData?: string;
  // SVCB/HTTPS record specific fields (svcParams as pipe-separated key|value)
  svcPriority?: string;
  svcTargetName?: string;
  svcParams?: string;
  autoIpv4Hint?: boolean;
  autoIpv6Hint?: boolean;
  // URI record specific fields
  uriPriority?: string;
  uriWeight?: string;
  uri?: string;
  // NAPTR record specific fields
  naptrOrder?: string;
  naptrPreference?: string;
  naptrFlags?: string;
  naptrServices?: string;
  naptrRegexp?: string;
  naptrReplacement?: string;
}

// Required fields per record type; gates both the Add button and submission.
function isAddFormComplete(data: RecordFormData): boolean {
  if (!data.name.trim()) return false;
  switch (data.type) {
    case "APP":
      return Boolean(data.appName?.trim() && data.classPath?.trim());
    case "SOA":
      return Boolean(
        data.primaryNameServer?.trim() && data.responsiblePerson?.trim(),
      );
    case "FWD":
      return Boolean(data.forwarder?.trim());
    case "DS":
      return Boolean(data.keyTag?.trim() && data.digest?.trim());
    case "SSHFP":
      return Boolean(data.sshfpFingerprint?.trim());
    case "TLSA":
      return Boolean(data.tlsaCertificateAssociationData?.trim());
    case "SVCB":
    case "HTTPS":
      return Boolean(data.svcTargetName?.trim());
    case "URI":
      return Boolean(data.uri?.trim());
    case "NAPTR":
      // Order and preference default to 0; the string fields may be empty.
      return true;
    default:
      return Boolean(data.value.trim());
  }
}

// Builds the edit-form state for a record. Reads the server's rData property
// names, which differ from the API's request parameter names for several
// types (SSHFP returns algorithm/fingerprintType/fingerprint, TLSA returns
// certificateUsage/selector/..., URI returns priority/weight, NAPTR returns
// order/preference/...).
function toEditData(
  record: DnsRecord,
): RecordFormData & { original: DnsRecord } {
  const rData = record.rData;
  const editData: RecordFormData & { original: DnsRecord } = {
    original: record,
    type: record.type,
    name: record.name,
    ttl: record.ttl.toString(),
    value: formatRData(record),
    comments: record.comments || "",
    expiryTtl: record.expiryTtl?.toString() || "0",
    ptr: false,
    createPtrZone: false,
    disabled: record.disabled,
  };

  if (record.type === "APP") {
    editData.appName = String(rData.appName || "");
    editData.classPath = String(rData.classPath || "");
    editData.recordData = String(rData.recordData || "");
  }

  if (record.type === "SOA") {
    editData.primaryNameServer = String(rData.primaryNameServer || "");
    editData.responsiblePerson = String(rData.responsiblePerson || "");
    editData.serial = String(rData.serial || "");
    editData.refresh = String(rData.refresh || "");
    editData.retry = String(rData.retry || "");
    editData.expire = String(rData.expire || "");
    editData.minimum = String(rData.minimum || "");
    editData.useSerialDateScheme = Boolean(rData.useSerialDateScheme);
  }

  if (record.type === "FWD") {
    editData.protocol = String(rData.protocol || "Udp");
    editData.forwarder = String(rData.forwarder || "");
    editData.forwarderPriority = String(rData.forwarderPriority || "0");
    editData.dnssecValidation = Boolean(rData.dnssecValidation);
    editData.proxyType = String(rData.proxyType || "DefaultProxy");
    editData.proxyAddress = String(rData.proxyAddress || "");
    editData.proxyPort = String(rData.proxyPort || "");
    editData.proxyUsername = String(rData.proxyUsername || "");
    editData.proxyPassword = String(rData.proxyPassword || "");
  }

  if (record.type === "DS") {
    editData.keyTag = String(rData.keyTag ?? "");
    editData.algorithm = enumToDashed(rData.algorithm, "ECDSAP256SHA256");
    editData.digestType = enumToDashed(rData.digestType, "SHA256");
    editData.digest = String(rData.digest || "");
  }

  if (record.type === "SSHFP") {
    editData.sshfpAlgorithm = enumToDashed(rData.algorithm, "Ed25519");
    editData.sshfpFingerprintType = enumToDashed(rData.fingerprintType, "SHA256");
    editData.sshfpFingerprint = String(rData.fingerprint || "");
  }

  if (record.type === "TLSA") {
    editData.tlsaCertificateUsage = enumToDashed(rData.certificateUsage, "DANE-EE");
    editData.tlsaSelector = enumToDashed(rData.selector, "SPKI");
    editData.tlsaMatchingType = enumToDashed(rData.matchingType, "SHA2-256");
    editData.tlsaCertificateAssociationData = String(
      rData.certificateAssociationData || "",
    );
  }

  if (record.type === "SVCB" || record.type === "HTTPS") {
    editData.svcPriority = String(rData.svcPriority ?? "1");
    editData.svcTargetName = String(rData.svcTargetName || "");
    editData.svcParams = svcParamsToPipe(rData.svcParams);
    editData.autoIpv4Hint = Boolean(rData.autoIpv4Hint);
    editData.autoIpv6Hint = Boolean(rData.autoIpv6Hint);
  }

  if (record.type === "URI") {
    editData.uriPriority = String(rData.priority ?? "0");
    editData.uriWeight = String(rData.weight ?? "0");
    editData.uri = String(rData.uri || "");
  }

  if (record.type === "NAPTR") {
    editData.naptrOrder = String(rData.order ?? "0");
    editData.naptrPreference = String(rData.preference ?? "0");
    editData.naptrFlags = String(rData.flags || "");
    editData.naptrServices = String(rData.services || "");
    editData.naptrRegexp = String(rData.regexp || "");
    editData.naptrReplacement = String(rData.replacement || "");
  }

  return editData;
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
      case "ANAME":
        return "Target Host";
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
      case "ANAME":
        return "target.example.com";
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
      case "ANAME":
        return "Resolves the target's A/AAAA records in place (CNAME flattening)";
      case "DS":
        return "Delegation signer digest for a DNSSEC-signed child zone";
      case "SSHFP":
        return "Publishes SSH host key fingerprints";
      case "TLSA":
        return "Associates a TLS certificate with a service (DANE)";
      case "SVCB":
        return "Service binding with connection parameters";
      case "HTTPS":
        return "HTTPS service binding with connection parameters";
      case "URI":
        return "Maps a domain to a URI";
      case "NAPTR":
        return "Rule-based rewrite record (ENUM/SIP)";
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
          <span className="text-sm text-muted-foreground flex-1 min-w-0 truncate">
            {getTypeDescription()}
          </span>
          {data.type !== "SOA" && (
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id="record-enabled"
                checked={!data.disabled}
                onCheckedChange={(checked) =>
                  onChange({ ...data, disabled: !checked })
                }
              />
              <Label
                htmlFor="record-enabled"
                className="text-sm font-normal cursor-pointer"
              >
                Enabled
              </Label>
            </div>
          )}
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

            {/* CNAME/NS/PTR/ANAME Records */}
            {(data.type === "CNAME" ||
              data.type === "NS" ||
              data.type === "PTR" ||
              data.type === "ANAME") && (
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

            {/* DS Record */}
            {data.type === "DS" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Key Tag
                    </Label>
                    <Input
                      type="number"
                      placeholder="12345"
                      value={data.keyTag || ""}
                      onChange={(e) =>
                        onChange({ ...data, keyTag: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Algorithm
                    </Label>
                    <Select
                      value={data.algorithm || "ECDSAP256SHA256"}
                      onValueChange={(v) => onChange({ ...data, algorithm: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DS_ALGORITHMS.map((alg) => (
                          <SelectItem key={alg} value={alg}>
                            {alg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Digest Type
                    </Label>
                    <Select
                      value={data.digestType || "SHA256"}
                      onValueChange={(v) =>
                        onChange({ ...data, digestType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DS_DIGEST_TYPES.map((dt) => (
                          <SelectItem key={dt} value={dt}>
                            {dt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Digest</Label>
                  <Input
                    placeholder="Hex digest of the child zone's KSK DNSKEY"
                    value={data.digest || ""}
                    onChange={(e) =>
                      onChange({ ...data, digest: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {/* SSHFP Record */}
            {data.type === "SSHFP" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Algorithm
                    </Label>
                    <Select
                      value={data.sshfpAlgorithm || "Ed25519"}
                      onValueChange={(v) =>
                        onChange({ ...data, sshfpAlgorithm: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SSHFP_ALGORITHMS.map((alg) => (
                          <SelectItem key={alg} value={alg}>
                            {alg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Fingerprint Type
                    </Label>
                    <Select
                      value={data.sshfpFingerprintType || "SHA256"}
                      onValueChange={(v) =>
                        onChange({ ...data, sshfpFingerprintType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SSHFP_FINGERPRINT_TYPES.map((ft) => (
                          <SelectItem key={ft} value={ft}>
                            {ft}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fingerprint</Label>
                  <Input
                    placeholder="Hex fingerprint of the host key"
                    value={data.sshfpFingerprint || ""}
                    onChange={(e) =>
                      onChange({ ...data, sshfpFingerprint: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {/* TLSA Record */}
            {data.type === "TLSA" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Certificate Usage
                    </Label>
                    <Select
                      value={data.tlsaCertificateUsage || "DANE-EE"}
                      onValueChange={(v) =>
                        onChange({ ...data, tlsaCertificateUsage: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TLSA_CERTIFICATE_USAGES.map((usage) => (
                          <SelectItem key={usage} value={usage}>
                            {usage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Selector
                    </Label>
                    <Select
                      value={data.tlsaSelector || "SPKI"}
                      onValueChange={(v) =>
                        onChange({ ...data, tlsaSelector: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TLSA_SELECTORS.map((sel) => (
                          <SelectItem key={sel} value={sel}>
                            {sel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Matching Type
                    </Label>
                    <Select
                      value={data.tlsaMatchingType || "SHA2-256"}
                      onValueChange={(v) =>
                        onChange({ ...data, tlsaMatchingType: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TLSA_MATCHING_TYPES.map((mt) => (
                          <SelectItem key={mt} value={mt}>
                            {mt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Certificate Association Data
                  </Label>
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono resize-y"
                    placeholder="Hex digest, or a PEM certificate to hash"
                    value={data.tlsaCertificateAssociationData || ""}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        tlsaCertificateAssociationData: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* SVCB/HTTPS Records */}
            {(data.type === "SVCB" || data.type === "HTTPS") && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-2 sm:col-span-3">
                    <Label className="text-sm font-medium">Target Name</Label>
                    <Input
                      placeholder={`svc.example.com, or "." for this name`}
                      value={data.svcTargetName || ""}
                      onChange={(e) =>
                        onChange({ ...data, svcTargetName: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Priority</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={data.svcPriority || ""}
                      onChange={(e) =>
                        onChange({ ...data, svcPriority: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Service Parameters
                  </Label>
                  <Input
                    placeholder="alpn|h2,h3|port|443"
                    value={data.svcParams || ""}
                    onChange={(e) =>
                      onChange({ ...data, svcParams: e.target.value })
                    }
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pipe-separated key and value pairs. Priority 0 makes this
                    an alias record.
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoIpv4Hint"
                      checked={data.autoIpv4Hint || false}
                      onCheckedChange={(checked) =>
                        onChange({ ...data, autoIpv4Hint: checked === true })
                      }
                    />
                    <Label
                      htmlFor="autoIpv4Hint"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Automatic ipv4hint
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoIpv6Hint"
                      checked={data.autoIpv6Hint || false}
                      onCheckedChange={(checked) =>
                        onChange({ ...data, autoIpv6Hint: checked === true })
                      }
                    />
                    <Label
                      htmlFor="autoIpv6Hint"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Automatic ipv6hint
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* URI Record */}
            {data.type === "URI" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">URI</Label>
                  <Input
                    placeholder="https://www.example.com/"
                    value={data.uri || ""}
                    onChange={(e) => onChange({ ...data, uri: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Priority
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={data.uriPriority || ""}
                      onChange={(e) =>
                        onChange({ ...data, uriPriority: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Weight
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={data.uriWeight || ""}
                      onChange={(e) =>
                        onChange({ ...data, uriWeight: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NAPTR Record */}
            {data.type === "NAPTR" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Order
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={data.naptrOrder || ""}
                      onChange={(e) =>
                        onChange({ ...data, naptrOrder: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Preference
                    </Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={data.naptrPreference || ""}
                      onChange={(e) =>
                        onChange({ ...data, naptrPreference: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Flags
                    </Label>
                    <Input
                      placeholder="S, A, U, P"
                      value={data.naptrFlags || ""}
                      onChange={(e) =>
                        onChange({ ...data, naptrFlags: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Services
                    </Label>
                    <Input
                      placeholder="E2U+sip"
                      value={data.naptrServices || ""}
                      onChange={(e) =>
                        onChange({ ...data, naptrServices: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Regexp
                    </Label>
                    <Input
                      placeholder="!^.*$!sip:info@example.com!"
                      value={data.naptrRegexp || ""}
                      onChange={(e) =>
                        onChange({ ...data, naptrRegexp: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Replacement
                    </Label>
                    <Input
                      placeholder="Domain, or empty when regexp is set"
                      value={data.naptrReplacement || ""}
                      onChange={(e) =>
                        onChange({ ...data, naptrReplacement: e.target.value })
                      }
                      className="font-mono"
                    />
                  </div>
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
  onDelete,
  onToggle,
  actions,
  initialRecordName,
  initialRecordType,
  initialRecordValue,
}: {
  zone: Zone;
  onBack: () => void;
  onDelete: (zone: Zone) => void;
  onToggle: (zone: Zone) => void;
  actions: ZoneActions;
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

    setInitialEditHandled(true);
    setEditRecord(toEditData(record));
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
    if (!isAddFormComplete(newRecord)) return;

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
        // The NS form reuses the comments field for glue addresses.
        if (newRecord.comments) {
          rdata.glue = newRecord.comments;
        }
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
      case "ANAME":
        rdata = { aname: newRecord.value };
        break;
      case "DS":
        rdata = {
          keyTag: newRecord.keyTag || "0",
          algorithm: newRecord.algorithm || "ECDSAP256SHA256",
          digestType: newRecord.digestType || "SHA256",
          digest: newRecord.digest || "",
        };
        break;
      case "SSHFP":
        rdata = {
          sshfpAlgorithm: newRecord.sshfpAlgorithm || "Ed25519",
          sshfpFingerprintType: newRecord.sshfpFingerprintType || "SHA256",
          sshfpFingerprint: newRecord.sshfpFingerprint || "",
        };
        break;
      case "TLSA":
        rdata = {
          tlsaCertificateUsage: newRecord.tlsaCertificateUsage || "DANE-EE",
          tlsaSelector: newRecord.tlsaSelector || "SPKI",
          tlsaMatchingType: newRecord.tlsaMatchingType || "SHA2-256",
          tlsaCertificateAssociationData:
            newRecord.tlsaCertificateAssociationData || "",
        };
        break;
      case "SVCB":
      case "HTTPS":
        // svcParams "false" means an empty parameter list.
        rdata = {
          svcPriority: newRecord.svcPriority || "1",
          svcTargetName: newRecord.svcTargetName || "",
          svcParams: newRecord.svcParams?.trim() || "false",
        };
        if (newRecord.autoIpv4Hint) rdata.autoIpv4Hint = "true";
        if (newRecord.autoIpv6Hint) rdata.autoIpv6Hint = "true";
        break;
      case "URI":
        rdata = {
          uriPriority: newRecord.uriPriority || "0",
          uriWeight: newRecord.uriWeight || "0",
          uri: newRecord.uri || "",
        };
        break;
      case "NAPTR":
        rdata = {
          naptrOrder: newRecord.naptrOrder || "0",
          naptrPreference: newRecord.naptrPreference || "0",
          naptrFlags: newRecord.naptrFlags || "",
          naptrServices: newRecord.naptrServices || "",
          naptrRegexp: newRecord.naptrRegexp || "",
          naptrReplacement: newRecord.naptrReplacement || "",
        };
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
        // For NS records the comments field carries glue, sent in rdata.
        comments: newRecord.type === "NS" ? "" : newRecord.comments,
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
    const editData = toEditData(record);
    setEditRecord(editData);
    setIsEditOpen(true);
    // Update URL to reflect editing state - include value to uniquely identify the record
    navigate(
      `/zones/${encodeURIComponent(zone.name)}/${encodeURIComponent(record.name)}/${record.type}/${encodeURIComponent(editData.value)}/edit`,
    );
  };

  const handleUpdateRecord = async () => {
    if (!editRecord) return;

    setIsSubmitting(true);

    // One atomic /zones/records/update call: current values identify the
    // record, new* params carry the changes. No delete + re-add, so a failed
    // update can never lose the record.
    const orig = editRecord.original.rData;
    const rdata: Record<string, string> = {};
    switch (editRecord.original.type) {
      case "A":
      case "AAAA":
        rdata.ipAddress = String(orig.ipAddress || "");
        rdata.newIpAddress = editRecord.value;
        break;
      case "CNAME":
        // CNAME is a singleton per name; the server takes the new value directly.
        rdata.cname = editRecord.value;
        break;
      case "NS":
        rdata.nameServer = String(orig.nameServer || "");
        rdata.newNameServer = editRecord.value;
        // The NS form reuses the comments field for glue addresses.
        if (editRecord.comments) {
          rdata.glue = editRecord.comments;
        }
        break;
      case "MX": {
        const [pref, exchange] = editRecord.value.split(" ");
        rdata.preference = String(orig.preference ?? "1");
        rdata.exchange = String(orig.exchange || "");
        rdata.newPreference = pref || "10";
        rdata.newExchange = exchange || editRecord.value;
        break;
      }
      case "TXT":
        rdata.text = String(orig.text || "");
        rdata.newText = editRecord.value;
        if (orig.splitText !== undefined) {
          rdata.splitText = String(orig.splitText);
        }
        break;
      case "PTR":
        rdata.ptrName = String(orig.ptrName || "");
        rdata.newPtrName = editRecord.value;
        break;
      case "SRV": {
        const parts = editRecord.value.split(" ");
        rdata.priority = String(orig.priority ?? "0");
        rdata.weight = String(orig.weight ?? "0");
        rdata.port = String(orig.port ?? "0");
        rdata.target = String(orig.target || "");
        rdata.newPriority = parts[0] || "0";
        rdata.newWeight = parts[1] || "0";
        rdata.newPort = parts[2] || "0";
        rdata.newTarget = parts[3] || "";
        break;
      }
      case "CAA": {
        const parts = editRecord.value.split(" ");
        rdata.flags = String(orig.flags ?? "0");
        rdata.tag = String(orig.tag || "issue");
        rdata.value = String(orig.value || "");
        rdata.newFlags = parts[0] || "0";
        rdata.newTag = parts[1] || "issue";
        rdata.newValue = parts.slice(2).join(" ").replace(/^"|"$/g, "");
        break;
      }
      case "APP":
        rdata.appName = editRecord.appName || "";
        rdata.classPath = editRecord.classPath || "";
        if (editRecord.recordData) {
          rdata.recordData = editRecord.recordData;
        }
        break;
      case "SOA":
        rdata.primaryNameServer = editRecord.primaryNameServer || "";
        rdata.responsiblePerson = editRecord.responsiblePerson || "";
        rdata.serial = editRecord.serial || "1";
        rdata.refresh = editRecord.refresh || "900";
        rdata.retry = editRecord.retry || "300";
        rdata.expire = editRecord.expire || "604800";
        rdata.minimum = editRecord.minimum || "86400";
        if (editRecord.useSerialDateScheme) {
          rdata.useSerialDateScheme = "true";
        }
        break;
      case "FWD":
        rdata.protocol = String(orig.protocol || "Udp");
        rdata.forwarder = String(orig.forwarder || "");
        rdata.newProtocol = editRecord.protocol || "Udp";
        rdata.newForwarder = editRecord.forwarder || "";
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
      case "ANAME":
        rdata.aname = String(orig.aname || "");
        rdata.newAName = editRecord.value;
        break;
      case "DS":
        rdata.keyTag = String(orig.keyTag ?? "");
        rdata.algorithm = enumToDashed(orig.algorithm);
        rdata.digestType = enumToDashed(orig.digestType);
        rdata.digest = String(orig.digest || "");
        rdata.newKeyTag = editRecord.keyTag || "0";
        rdata.newAlgorithm = editRecord.algorithm || "ECDSAP256SHA256";
        rdata.newDigestType = editRecord.digestType || "SHA256";
        rdata.newDigest = editRecord.digest || "";
        break;
      case "SSHFP":
        rdata.sshfpAlgorithm = enumToDashed(orig.algorithm);
        rdata.sshfpFingerprintType = enumToDashed(orig.fingerprintType);
        rdata.sshfpFingerprint = String(orig.fingerprint || "");
        rdata.newSshfpAlgorithm = editRecord.sshfpAlgorithm || "Ed25519";
        rdata.newSshfpFingerprintType =
          editRecord.sshfpFingerprintType || "SHA256";
        rdata.newSshfpFingerprint = editRecord.sshfpFingerprint || "";
        break;
      case "TLSA":
        rdata.tlsaCertificateUsage = enumToDashed(orig.certificateUsage);
        rdata.tlsaSelector = enumToDashed(orig.selector);
        rdata.tlsaMatchingType = enumToDashed(orig.matchingType);
        rdata.tlsaCertificateAssociationData = String(
          orig.certificateAssociationData || "",
        );
        rdata.newTlsaCertificateUsage =
          editRecord.tlsaCertificateUsage || "DANE-EE";
        rdata.newTlsaSelector = editRecord.tlsaSelector || "SPKI";
        rdata.newTlsaMatchingType = editRecord.tlsaMatchingType || "SHA2-256";
        rdata.newTlsaCertificateAssociationData =
          editRecord.tlsaCertificateAssociationData || "";
        break;
      case "SVCB":
      case "HTTPS":
        // svcParams "false" means an empty parameter list.
        rdata.svcPriority = String(orig.svcPriority ?? "0");
        rdata.svcTargetName = String(orig.svcTargetName || "");
        rdata.svcParams = svcParamsToPipe(orig.svcParams) || "false";
        rdata.newSvcPriority = editRecord.svcPriority || "1";
        rdata.newSvcTargetName = editRecord.svcTargetName || "";
        rdata.newSvcParams = editRecord.svcParams?.trim() || "false";
        if (editRecord.autoIpv4Hint) rdata.autoIpv4Hint = "true";
        if (editRecord.autoIpv6Hint) rdata.autoIpv6Hint = "true";
        break;
      case "URI":
        rdata.uriPriority = String(orig.priority ?? "0");
        rdata.uriWeight = String(orig.weight ?? "0");
        rdata.uri = String(orig.uri || "");
        rdata.newUriPriority = editRecord.uriPriority || "0";
        rdata.newUriWeight = editRecord.uriWeight || "0";
        rdata.newUri = editRecord.uri || "";
        break;
      case "NAPTR":
        // The update API uses naptrNew* names, not newNaptr*.
        rdata.naptrOrder = String(orig.order ?? "0");
        rdata.naptrPreference = String(orig.preference ?? "0");
        rdata.naptrFlags = String(orig.flags || "");
        rdata.naptrServices = String(orig.services || "");
        rdata.naptrRegexp = String(orig.regexp || "");
        rdata.naptrReplacement = String(orig.replacement || "");
        rdata.naptrNewOrder = editRecord.naptrOrder || "0";
        rdata.naptrNewPreference = editRecord.naptrPreference || "0";
        rdata.naptrNewFlags = editRecord.naptrFlags || "";
        rdata.naptrNewServices = editRecord.naptrServices || "";
        rdata.naptrNewRegexp = editRecord.naptrRegexp || "";
        rdata.naptrNewReplacement = editRecord.naptrReplacement || "";
        break;
      default:
        toast.error(
          `Editing ${editRecord.original.type} records is not supported`,
        );
        setIsSubmitting(false);
        return;
    }

    // Support renaming: normalize the form name to a FQDN like the add flow.
    const newDomain = editRecord.name.endsWith(zone.name)
      ? editRecord.name
      : editRecord.name === "@"
        ? zone.name
        : `${editRecord.name}.${zone.name}`;

    const response = await updateRecord(
      zone.name,
      editRecord.original.name,
      editRecord.original.type,
      rdata,
      {
        newDomain,
        ttl: parseInt(editRecord.ttl),
        disable: editRecord.disabled ?? false,
        // For NS records the comments field carries glue, sent above.
        comments:
          editRecord.original.type === "NS" ? undefined : editRecord.comments,
        expiryTtl: parseInt(editRecord.expiryTtl),
        ptr: editRecord.ptr,
        createPtrZone: editRecord.createPtrZone,
      },
    );

    if (response.status === "ok") {
      toast.success("Record updated successfully");
      setEditRecord(null);
      setIsEditOpen(false);
      navigate(`/zones/${encodeURIComponent(zone.name)}`);
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to update record");
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
        if (recordToDelete.rData.splitText !== undefined) {
          rdata.splitText = String(recordToDelete.rData.splitText);
        }
        break;
      case "PTR":
        rdata.ptrName = String(recordToDelete.rData.ptrName || "");
        break;
      case "SRV":
        rdata.priority = String(recordToDelete.rData.priority ?? "0");
        rdata.weight = String(recordToDelete.rData.weight ?? "0");
        rdata.port = String(recordToDelete.rData.port ?? "0");
        rdata.target = String(recordToDelete.rData.target || "");
        break;
      case "CAA":
        rdata.flags = String(recordToDelete.rData.flags ?? "0");
        rdata.tag = String(recordToDelete.rData.tag || "issue");
        rdata.value = String(recordToDelete.rData.value || "");
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
      case "ANAME":
        rdata.aname = String(recordToDelete.rData.aname || "");
        break;
      case "DS":
        rdata.keyTag = String(recordToDelete.rData.keyTag ?? "");
        rdata.algorithm = enumToDashed(recordToDelete.rData.algorithm);
        rdata.digestType = enumToDashed(recordToDelete.rData.digestType);
        rdata.digest = String(recordToDelete.rData.digest || "");
        break;
      case "SSHFP":
        rdata.sshfpAlgorithm = enumToDashed(recordToDelete.rData.algorithm);
        rdata.sshfpFingerprintType = enumToDashed(
          recordToDelete.rData.fingerprintType,
        );
        rdata.sshfpFingerprint = String(recordToDelete.rData.fingerprint || "");
        break;
      case "TLSA":
        rdata.tlsaCertificateUsage = enumToDashed(
          recordToDelete.rData.certificateUsage,
        );
        rdata.tlsaSelector = enumToDashed(recordToDelete.rData.selector);
        rdata.tlsaMatchingType = enumToDashed(
          recordToDelete.rData.matchingType,
        );
        rdata.tlsaCertificateAssociationData = String(
          recordToDelete.rData.certificateAssociationData || "",
        );
        break;
      case "SVCB":
      case "HTTPS":
        rdata.svcPriority = String(recordToDelete.rData.svcPriority ?? "0");
        rdata.svcTargetName = String(recordToDelete.rData.svcTargetName || "");
        rdata.svcParams =
          svcParamsToPipe(recordToDelete.rData.svcParams) || "false";
        break;
      case "URI":
        rdata.uriPriority = String(recordToDelete.rData.priority ?? "0");
        rdata.uriWeight = String(recordToDelete.rData.weight ?? "0");
        rdata.uri = String(recordToDelete.rData.uri || "");
        break;
      case "NAPTR":
        rdata.naptrOrder = String(recordToDelete.rData.order ?? "0");
        rdata.naptrPreference = String(recordToDelete.rData.preference ?? "0");
        rdata.naptrFlags = String(recordToDelete.rData.flags || "");
        rdata.naptrServices = String(recordToDelete.rData.services || "");
        rdata.naptrRegexp = String(recordToDelete.rData.regexp || "");
        rdata.naptrReplacement = String(
          recordToDelete.rData.replacement || "",
        );
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
            {zone.type === "Primary" && !zone.internal ? (
              <button
                type="button"
                onClick={() => actions.onDnssec(zone)}
                className="hidden sm:inline-flex"
              >
                <Badge
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-muted transition-colors"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  DNSSEC: {zone.dnssecStatus || "Unsigned"}
                </Badge>
              </button>
            ) : (
              zone.dnssecStatus &&
              zone.dnssecStatus !== "Unsigned" && (
                <Badge
                  variant="outline"
                  className="text-xs hidden sm:inline-flex"
                >
                  DNSSEC: {zone.dnssecStatus}
                </Badge>
              )
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ZoneActionMenuItems zone={zone} actions={actions} />
              <DropdownMenuItem onClick={() => onToggle(zone)}>
                <Power className="h-4 w-4 mr-2" />
                {zone.disabled ? "Enable Zone" : "Disable Zone"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(zone)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Zone
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Record</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              showCloseButton={false}
              className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
            >
              <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
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
              {/* min-h-0 lets this flex child shrink so it scrolls instead of
                  overflowing the dialog when the form is taller than 90vh. */}
              <div className="overflow-y-auto px-6 flex-1 min-h-0">
                <RecordForm
                  data={newRecord}
                  onChange={setNewRecord}
                  installedApps={installedApps}
                />
              </div>
              <DialogFooter className="shrink-0 px-6 py-4 border-t">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddRecord}
                  disabled={isSubmitting || !isAddFormComplete(newRecord)}
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
            className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
          >
            <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
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
            {/* min-h-0 lets this flex child shrink so it scrolls instead of
                overflowing the dialog when the form is taller than 90vh. */}
            <div className="overflow-y-auto px-6 flex-1 min-h-0">
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
            <DialogFooter className="shrink-0 px-6 py-4 border-t flex-col sm:flex-row gap-2">
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
              {filteredRecords.map((record, idx) => {
                // DNSSEC-managed types (RRSIG, NSEC, DNSKEY, ...) are
                // server-maintained and have no editor.
                const editable = recordTypes.includes(record.type);
                return (
                  <div
                    key={`${record.name}-${record.type}-${idx}`}
                    className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-muted/50 transition-colors group ${
                      editable ? "cursor-pointer" : ""
                    } ${record.disabled ? "opacity-60" : ""}`}
                    onClick={editable ? () => handleEditClick(record) : undefined}
                  >
                    <Badge
                      variant="outline"
                      className="w-12 sm:w-14 justify-center font-mono text-xs shrink-0"
                    >
                      {record.type}
                    </Badge>
                    <span className="flex-[3] min-w-0" onClick={(e) => e.stopPropagation()}>
                      <CopyableText
                        text={record.name}
                        iconVisibility="hover"
                        className="font-mono text-sm w-full min-w-0"
                      />
                    </span>
                    <span className="flex-[2] min-w-0 hidden sm:block" onClick={(e) => e.stopPropagation()}>
                      <CopyableText
                        text={formatRData(record)}
                        iconVisibility="hover"
                        className="font-mono text-sm text-muted-foreground w-full min-w-0"
                      />
                    </span>
                    {record.disabled && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground text-xs shrink-0"
                      >
                        Disabled
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground w-12 sm:w-16 text-right shrink-0">
                      {record.ttl}s
                    </span>
                    {editable ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                  </div>
                );
              })}
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
  useDocumentTitle(zoneName ? `${zoneName} - Zones` : "Zones");
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

  // Zone management dialogs (shared by the list rows and the detail header)
  const [optionsZone, setOptionsZone] = useState<Zone | null>(null);
  const [permissionsZone, setPermissionsZone] = useState<Zone | null>(null);
  const [dnssecZone, setDnssecZone] = useState<Zone | null>(null);
  const [importTarget, setImportTarget] = useState<Zone | null>(null);
  const [cloneSource, setCloneSource] = useState<Zone | null>(null);
  const [convertTarget, setConvertTarget] = useState<Zone | null>(null);
  // Bumped after an import so the records view refetches.
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);

  // Reset to the first page whenever a filter changes (set in the handlers).
  const [page, setPage] = useState(1);

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

  const ZONES_PER_PAGE = 25;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredZones.length / ZONES_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pagedZones = filteredZones.slice(
    (currentPage - 1) * ZONES_PER_PAGE,
    currentPage * ZONES_PER_PAGE,
  );

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
      // If we're viewing the zone being deleted, navigate back to the list
      if (zoneName === zoneToDelete.name) {
        navigate("/zones");
      }
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to delete zone");
    }
    setZoneToDelete(null);
  };

  const handleToggle = async (zone: Zone) => {
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

  const handleExport = async (zone: Zone) => {
    try {
      const { blob, filename } = await exportZone(zone.name);
      saveBlob(blob, filename);
      toast.success(`Exported ${zone.name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export zone",
      );
    }
  };

  const handleResync = async (zone: Zone) => {
    const response = await resyncZone(zone.name);
    if (response.status === "ok") {
      toast.success(`Resync started for ${zone.name}`);
      refetch();
    } else {
      toast.error(response.errorMessage || "Failed to resync zone");
    }
  };

  const zoneActions: ZoneActions = {
    onOptions: setOptionsZone,
    onPermissions: setPermissionsZone,
    onDnssec: setDnssecZone,
    onImport: setImportTarget,
    onExport: handleExport,
    onClone: setCloneSource,
    onConvert: setConvertTarget,
    onResync: handleResync,
  };

  const zoneDialogs = (
    <>
      <ZoneOptionsDialog
        zone={optionsZone}
        onOpenChange={(open) => {
          if (!open) setOptionsZone(null);
        }}
        onSaved={refetch}
      />
      <ZonePermissionsDialog
        zone={permissionsZone}
        onOpenChange={(open) => {
          if (!open) setPermissionsZone(null);
        }}
      />
      <DnssecDialog
        zone={dnssecZone}
        onOpenChange={(open) => {
          if (!open) setDnssecZone(null);
        }}
        onChanged={() => {
          refetch();
          setRecordsRefreshKey((k) => k + 1);
        }}
      />
      <ZoneImportDialog
        zone={importTarget}
        onOpenChange={(open) => {
          if (!open) setImportTarget(null);
        }}
        onImported={() => setRecordsRefreshKey((k) => k + 1)}
      />
      <ZoneCloneDialog
        zone={cloneSource}
        onOpenChange={(open) => {
          if (!open) setCloneSource(null);
        }}
        onCloned={(newZone) => {
          refetch();
          navigate(`/zones/${encodeURIComponent(newZone)}`);
        }}
      />
      <ZoneConvertDialog
        zone={convertTarget}
        onOpenChange={(open) => {
          if (!open) setConvertTarget(null);
        }}
        onConverted={refetch}
      />
    </>
  );

  // Show zone detail view if a zone is selected
  if (selectedZone) {
    return (
      <>
        <ZoneRecordsView
          key={`${selectedZone.name}-${recordsRefreshKey}`}
          zone={selectedZone}
          onBack={() => navigate("/zones")}
          onDelete={(z) => setZoneToDelete(z)}
          onToggle={(z) => handleToggle(z)}
          actions={zoneActions}
          initialRecordName={recordName}
          initialRecordType={recordType}
          initialRecordValue={recordValue}
        />
        {zoneDialogs}

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
      </>
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
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
          >
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
            onValueChange={(v: "all" | "active" | "disabled") => {
              setStatusFilter(v);
              setPage(1);
            }}
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
              {pagedZones.map((zone) => (
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
                      <ZoneActionMenuItems
                        zone={zone}
                        actions={zoneActions}
                        compact
                      />
                      <DropdownMenuItem onClick={() => handleToggle(zone)}>
                        <Power className="h-4 w-4 mr-2" />
                        {zone.disabled ? "Enable Zone" : "Disable Zone"}
                      </DropdownMenuItem>
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

      {/* Pagination */}
      {filteredZones.length > ZONES_PER_PAGE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(currentPage - 1) * ZONES_PER_PAGE + 1}–
            {Math.min(currentPage * ZONES_PER_PAGE, filteredZones.length)} of{" "}
            {filteredZones.length} zones
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="px-2 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}

      {zoneDialogs}

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
