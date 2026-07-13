import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getZoneOptions, setZoneOptions } from "@/api/dns";
import { toast } from "sonner";
import type { Zone, ZoneOptions } from "@/types/api";

// Sentinel for Radix Select, which does not allow empty item values.
const NONE = "__none__";

const ACL_MODES = new Set([
  "UseSpecifiedNetworkACL",
  "AllowZoneNameServersAndUseSpecifiedNetworkACL",
]);

const ACCESS_LABELS: Record<string, string> = {
  Deny: "Deny",
  Allow: "Allow",
  AllowOnlyPrivateNetworks: "Allow only private networks",
  AllowOnlyZoneNameServers: "Allow only zone name servers",
  UseSpecifiedNetworkACL: "Use specified network ACL",
  AllowZoneNameServersAndUseSpecifiedNetworkACL:
    "Zone name servers + specified ACL",
};

const NOTIFY_LABELS: Record<string, string> = {
  None: "None",
  ZoneNameServers: "Zone name servers",
  SpecifiedNameServers: "Specified name servers",
  BothZoneAndSpecifiedNameServers: "Both zone & specified name servers",
  SeparateNameServersForCatalogAndMemberZones:
    "Separate for catalog & member zones",
};

function accessOptionsFor(type: Zone["type"], forTransferOrUpdate = false) {
  if (type === "Primary" || type === "Secondary") {
    return forTransferOrUpdate
      ? [
          "Deny",
          "Allow",
          "AllowOnlyZoneNameServers",
          "UseSpecifiedNetworkACL",
          "AllowZoneNameServersAndUseSpecifiedNetworkACL",
        ]
      : [
          "Deny",
          "Allow",
          "AllowOnlyPrivateNetworks",
          "AllowOnlyZoneNameServers",
          "UseSpecifiedNetworkACL",
          "AllowZoneNameServersAndUseSpecifiedNetworkACL",
        ];
  }
  return forTransferOrUpdate
    ? ["Deny", "Allow", "UseSpecifiedNetworkACL"]
    : ["Deny", "Allow", "AllowOnlyPrivateNetworks", "UseSpecifiedNetworkACL"];
}

function notifyOptionsFor(type: Zone["type"]) {
  if (type === "Catalog") {
    return [
      "None",
      "SpecifiedNameServers",
      "SeparateNameServersForCatalogAndMemberZones",
    ];
  }
  if (type === "Forwarder") {
    return ["None", "SpecifiedNameServers"];
  }
  return [
    "None",
    "ZoneNameServers",
    "SpecifiedNameServers",
    "BothZoneAndSpecifiedNameServers",
  ];
}

interface PolicyRow {
  tsigKeyName: string;
  domain: string;
  allowedTypes: string;
}

interface FormState {
  catalog: string;
  overrideCatalogQueryAccess: boolean;
  overrideCatalogZoneTransfer: boolean;
  overrideCatalogNotify: boolean;
  primaryNameServerAddresses: string;
  primaryZoneTransferProtocol: string;
  primaryZoneTransferTsigKeyName: string;
  validateZone: boolean;
  queryAccess: string;
  queryAccessNetworkACL: string;
  zoneTransfer: string;
  zoneTransferNetworkACL: string;
  zoneTransferTsigKeyNames: string[];
  notify: string;
  notifyNameServers: string;
  notifySecondaryCatalogsNameServers: string;
  update: string;
  updateNetworkACL: string;
  updateSecurityPolicies: PolicyRow[];
}

function toList(value: string): string {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export function ZoneOptionsDialog({
  zone,
  onOpenChange,
  onSaved,
}: {
  zone: Zone | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [options, setOptions] = useState<ZoneOptions | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!zone) {
      setOptions(null);
      setForm(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    getZoneOptions(zone.name)
      .then((response) => {
        if (cancelled) return;
        if (response.status === "ok" && response.response) {
          const opts = response.response;
          setOptions(opts);
          setForm({
            catalog: opts.catalog ?? "",
            overrideCatalogQueryAccess: opts.overrideCatalogQueryAccess ?? false,
            overrideCatalogZoneTransfer:
              opts.overrideCatalogZoneTransfer ?? false,
            overrideCatalogNotify: opts.overrideCatalogNotify ?? false,
            primaryNameServerAddresses: (
              opts.primaryNameServerAddresses ?? []
            ).join(", "),
            primaryZoneTransferProtocol:
              opts.primaryZoneTransferProtocol ?? "Tcp",
            primaryZoneTransferTsigKeyName:
              opts.primaryZoneTransferTsigKeyName ?? "",
            validateZone: opts.validateZone ?? false,
            queryAccess: opts.queryAccess ?? "Allow",
            queryAccessNetworkACL: (opts.queryAccessNetworkACL ?? []).join(
              ", ",
            ),
            zoneTransfer: opts.zoneTransfer ?? "Deny",
            zoneTransferNetworkACL: (opts.zoneTransferNetworkACL ?? []).join(
              ", ",
            ),
            zoneTransferTsigKeyNames: opts.zoneTransferTsigKeyNames ?? [],
            notify: opts.notify ?? "None",
            notifyNameServers: (opts.notifyNameServers ?? []).join(", "),
            notifySecondaryCatalogsNameServers: (
              opts.notifySecondaryCatalogsNameServers ?? []
            ).join(", "),
            update: opts.update ?? "Deny",
            updateNetworkACL: (opts.updateNetworkACL ?? []).join(", "),
            updateSecurityPolicies: (opts.updateSecurityPolicies ?? []).map(
              (p) => ({
                tsigKeyName: p.tsigKeyName,
                domain: p.domain,
                allowedTypes: p.allowedTypes.join(", "),
              }),
            ),
          });
        } else {
          toast.error(response.errorMessage || "Failed to load zone options");
          onOpenChange(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load zone options",
        );
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone?.name]);

  const handleSave = async () => {
    if (!zone || !options || !form) return;
    setIsSaving(true);

    const params: Record<string, string> = {};

    if (options.catalog !== undefined) {
      params.catalog = form.catalog;
    }
    if (options.overrideCatalogQueryAccess !== undefined) {
      params.overrideCatalogQueryAccess = String(
        form.overrideCatalogQueryAccess,
      );
    }
    if (options.overrideCatalogZoneTransfer !== undefined) {
      params.overrideCatalogZoneTransfer = String(
        form.overrideCatalogZoneTransfer,
      );
    }
    if (options.overrideCatalogNotify !== undefined) {
      params.overrideCatalogNotify = String(form.overrideCatalogNotify);
    }
    if (options.primaryNameServerAddresses !== undefined) {
      params.primaryNameServerAddresses = toList(
        form.primaryNameServerAddresses,
      );
    }
    if (options.primaryZoneTransferProtocol !== undefined) {
      params.primaryZoneTransferProtocol = form.primaryZoneTransferProtocol;
    }
    if (options.primaryZoneTransferTsigKeyName !== undefined) {
      params.primaryZoneTransferTsigKeyName =
        form.primaryZoneTransferTsigKeyName;
    }
    if (options.validateZone !== undefined) {
      params.validateZone = String(form.validateZone);
    }
    if (options.queryAccess !== undefined) {
      params.queryAccess = form.queryAccess;
      if (ACL_MODES.has(form.queryAccess)) {
        params.queryAccessNetworkACL =
          toList(form.queryAccessNetworkACL) || "false";
      }
    }
    if (options.zoneTransfer !== undefined) {
      params.zoneTransfer = form.zoneTransfer;
      if (ACL_MODES.has(form.zoneTransfer)) {
        params.zoneTransferNetworkACL =
          toList(form.zoneTransferNetworkACL) || "false";
      }
      params.zoneTransferTsigKeyNames =
        form.zoneTransferTsigKeyNames.join(",") || "false";
    }
    if (options.notify !== undefined) {
      params.notify = form.notify;
      if (
        form.notify === "SpecifiedNameServers" ||
        form.notify === "BothZoneAndSpecifiedNameServers"
      ) {
        params.notifyNameServers = toList(form.notifyNameServers);
      }
      if (form.notify === "SeparateNameServersForCatalogAndMemberZones") {
        params.notifyNameServers = toList(form.notifyNameServers);
        params.notifySecondaryCatalogsNameServers = toList(
          form.notifySecondaryCatalogsNameServers,
        );
      }
    }
    if (options.update !== undefined) {
      params.update = form.update;
      if (ACL_MODES.has(form.update)) {
        params.updateNetworkACL = toList(form.updateNetworkACL) || "false";
      }
      if (options.updateSecurityPolicies !== undefined) {
        const rows = form.updateSecurityPolicies.filter(
          (p) => p.tsigKeyName && p.domain,
        );
        params.updateSecurityPolicies = rows.length
          ? rows
              .map((p) =>
                [p.tsigKeyName, p.domain, toList(p.allowedTypes) || "ANY"].join(
                  "|",
                ),
              )
              .join("|")
          : "false";
      }
    }

    const response = await setZoneOptions(zone.name, params);
    if (response.status === "ok") {
      toast.success(`Options saved for ${zone.name}`);
      onOpenChange(false);
      onSaved?.();
    } else {
      toast.error(response.errorMessage || "Failed to save zone options");
    }
    setIsSaving(false);
  };

  const tsigKeys = options?.availableTsigKeyNames ?? [];
  const catalogs = options?.availableCatalogZoneNames ?? [];

  return (
    <Dialog open={!!zone} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0"
      >
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <DialogTitle className="truncate">Zone Settings</DialogTitle>
              <DialogDescription className="font-mono truncate">
                {zone?.name}
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

        <div className="overflow-y-auto px-6 py-4 flex-1 space-y-6">
          {isLoading || !form || !options ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {options.notifyFailed && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium">Notify failed</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Could not notify:{" "}
                      {(options.notifyFailedFor ?? []).join(", ") || "unknown"}
                    </p>
                  </div>
                </div>
              )}

              {/* Catalog membership */}
              {options.catalog !== undefined && catalogs.length > 0 && (
                <section className="space-y-3">
                  <SectionHeader
                    title="Catalog Zone"
                    hint="Register this zone as a member of a catalog zone"
                  />
                  <Select
                    value={form.catalog || NONE}
                    onValueChange={(v) =>
                      setForm({ ...form, catalog: v === NONE ? "" : v })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {catalogs.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.catalog && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {options.overrideCatalogQueryAccess !== undefined && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="ovr-query"
                            checked={form.overrideCatalogQueryAccess}
                            onCheckedChange={(c) =>
                              setForm({
                                ...form,
                                overrideCatalogQueryAccess: c === true,
                              })
                            }
                          />
                          <Label
                            htmlFor="ovr-query"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Override query access
                          </Label>
                        </div>
                      )}
                      {options.overrideCatalogZoneTransfer !== undefined && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="ovr-transfer"
                            checked={form.overrideCatalogZoneTransfer}
                            onCheckedChange={(c) =>
                              setForm({
                                ...form,
                                overrideCatalogZoneTransfer: c === true,
                              })
                            }
                          />
                          <Label
                            htmlFor="ovr-transfer"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Override zone transfer
                          </Label>
                        </div>
                      )}
                      {options.overrideCatalogNotify !== undefined && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="ovr-notify"
                            checked={form.overrideCatalogNotify}
                            onCheckedChange={(c) =>
                              setForm({
                                ...form,
                                overrideCatalogNotify: c === true,
                              })
                            }
                          />
                          <Label
                            htmlFor="ovr-notify"
                            className="text-sm font-normal cursor-pointer"
                          >
                            Override notify
                          </Label>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Primary name servers (Secondary / Stub kinds) */}
              {options.primaryNameServerAddresses !== undefined && (
                <section className="space-y-3">
                  <SectionHeader
                    title="Primary Name Servers"
                    hint="Comma separated addresses; leave empty to resolve automatically"
                  />
                  <Input
                    placeholder="192.168.1.5, ns1.example.com"
                    value={form.primaryNameServerAddresses}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        primaryNameServerAddresses: e.target.value,
                      })
                    }
                    className="font-mono"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {options.primaryZoneTransferProtocol !== undefined && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Zone Transfer Protocol
                        </Label>
                        <Select
                          value={form.primaryZoneTransferProtocol}
                          onValueChange={(v) =>
                            setForm({
                              ...form,
                              primaryZoneTransferProtocol: v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tcp">TCP (XFR)</SelectItem>
                            <SelectItem value="Tls">TLS (XFR-over-TLS)</SelectItem>
                            <SelectItem value="Quic">QUIC (XFR-over-QUIC)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {options.primaryZoneTransferTsigKeyName !== undefined && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          TSIG Key
                        </Label>
                        <Select
                          value={form.primaryZoneTransferTsigKeyName || NONE}
                          onValueChange={(v) =>
                            setForm({
                              ...form,
                              primaryZoneTransferTsigKeyName:
                                v === NONE ? "" : v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>None</SelectItem>
                            {tsigKeys.map((key) => (
                              <SelectItem key={key} value={key}>
                                {key}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {options.validateZone !== undefined && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="validate-zone"
                        checked={form.validateZone}
                        onCheckedChange={(c) =>
                          setForm({ ...form, validateZone: c === true })
                        }
                      />
                      <Label
                        htmlFor="validate-zone"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Validate zone with ZONEMD after transfer
                      </Label>
                    </div>
                  )}
                </section>
              )}

              {/* Query access */}
              {options.queryAccess !== undefined && zone && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <SectionHeader
                      title="Query Access"
                      hint="Who is allowed to query this zone"
                    />
                    <Select
                      value={form.queryAccess}
                      onValueChange={(v) => setForm({ ...form, queryAccess: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accessOptionsFor(zone.type).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {ACCESS_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ACL_MODES.has(form.queryAccess) && (
                      <div className="space-y-1">
                        <Textarea
                          placeholder="192.168.1.0/24, !192.168.1.99, 10.0.0.5"
                          value={form.queryAccessNetworkACL}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              queryAccessNetworkACL: e.target.value,
                            })
                          }
                          className="font-mono min-h-[60px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma separated networks; prefix with ! to deny
                        </p>
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* Zone transfer */}
              {options.zoneTransfer !== undefined && zone && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <SectionHeader
                      title="Zone Transfer"
                      hint="Who may transfer (AXFR/IXFR) this zone"
                    />
                    <Select
                      value={form.zoneTransfer}
                      onValueChange={(v) =>
                        setForm({ ...form, zoneTransfer: v })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accessOptionsFor(zone.type, true).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {ACCESS_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ACL_MODES.has(form.zoneTransfer) && (
                      <div className="space-y-1">
                        <Textarea
                          placeholder="192.168.1.0/24, !192.168.1.99"
                          value={form.zoneTransferNetworkACL}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              zoneTransferNetworkACL: e.target.value,
                            })
                          }
                          className="font-mono min-h-[60px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma separated networks; prefix with ! to deny
                        </p>
                      </div>
                    )}
                    {tsigKeys.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Authorized TSIG Keys
                        </Label>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          {tsigKeys.map((key) => (
                            <div
                              key={key}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`tsig-${key}`}
                                checked={form.zoneTransferTsigKeyNames.includes(
                                  key,
                                )}
                                onCheckedChange={(c) =>
                                  setForm({
                                    ...form,
                                    zoneTransferTsigKeyNames:
                                      c === true
                                        ? [
                                            ...form.zoneTransferTsigKeyNames,
                                            key,
                                          ]
                                        : form.zoneTransferTsigKeyNames.filter(
                                            (k) => k !== key,
                                          ),
                                  })
                                }
                              />
                              <Label
                                htmlFor={`tsig-${key}`}
                                className="text-sm font-normal font-mono cursor-pointer"
                              >
                                {key}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* Notify */}
              {options.notify !== undefined && zone && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <SectionHeader
                      title="Notify"
                      hint="Which name servers get notified on zone updates"
                    />
                    <Select
                      value={form.notify}
                      onValueChange={(v) => setForm({ ...form, notify: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notifyOptionsFor(zone.type).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {NOTIFY_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(form.notify === "SpecifiedNameServers" ||
                      form.notify === "BothZoneAndSpecifiedNameServers" ||
                      form.notify ===
                        "SeparateNameServersForCatalogAndMemberZones") && (
                      <Input
                        placeholder="192.168.1.10, 192.168.1.11"
                        value={form.notifyNameServers}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            notifyNameServers: e.target.value,
                          })
                        }
                        className="font-mono"
                      />
                    )}
                    {form.notify ===
                      "SeparateNameServersForCatalogAndMemberZones" && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Secondary Catalog Name Servers
                        </Label>
                        <Input
                          placeholder="192.168.1.20, 192.168.1.21"
                          value={form.notifySecondaryCatalogsNameServers}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              notifySecondaryCatalogsNameServers:
                                e.target.value,
                            })
                          }
                          className="font-mono"
                        />
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* Dynamic updates */}
              {options.update !== undefined && zone && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <SectionHeader
                      title="Dynamic Updates"
                      hint="RFC 2136 dynamic DNS updates"
                    />
                    <Select
                      value={form.update}
                      onValueChange={(v) => setForm({ ...form, update: v })}
                    >
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(zone.type === "Primary"
                          ? accessOptionsFor("Primary", true)
                          : ["Deny", "Allow", "UseSpecifiedNetworkACL"]
                        ).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {ACCESS_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ACL_MODES.has(form.update) && (
                      <div className="space-y-1">
                        <Textarea
                          placeholder="192.168.1.0/24"
                          value={form.updateNetworkACL}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              updateNetworkACL: e.target.value,
                            })
                          }
                          className="font-mono min-h-[60px]"
                        />
                        <p className="text-xs text-muted-foreground">
                          Comma separated networks; prefix with ! to deny
                        </p>
                      </div>
                    )}
                    {options.updateSecurityPolicies !== undefined &&
                      form.update !== "Deny" && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">
                              TSIG Security Policies
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              disabled={tsigKeys.length === 0}
                              onClick={() =>
                                setForm({
                                  ...form,
                                  updateSecurityPolicies: [
                                    ...form.updateSecurityPolicies,
                                    {
                                      tsigKeyName: tsigKeys[0] ?? "",
                                      domain: zone.name,
                                      allowedTypes: "ANY",
                                    },
                                  ],
                                })
                              }
                            >
                              <Plus className="h-3 w-3" />
                              Add Policy
                            </Button>
                          </div>
                          {form.updateSecurityPolicies.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              {tsigKeys.length === 0
                                ? "Add TSIG keys in Settings to require signed updates."
                                : "No policies — updates are not TSIG-authenticated."}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {form.updateSecurityPolicies.map((policy, i) => (
                                <div
                                  key={i}
                                  className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
                                >
                                  <Select
                                    value={policy.tsigKeyName}
                                    onValueChange={(v) => {
                                      const next = [
                                        ...form.updateSecurityPolicies,
                                      ];
                                      next[i] = { ...policy, tsigKeyName: v };
                                      setForm({
                                        ...form,
                                        updateSecurityPolicies: next,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="sm:w-[160px]">
                                      <SelectValue placeholder="TSIG key" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {tsigKeys.map((key) => (
                                        <SelectItem key={key} value={key}>
                                          {key}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    placeholder="example.com or *.example.com"
                                    value={policy.domain}
                                    onChange={(e) => {
                                      const next = [
                                        ...form.updateSecurityPolicies,
                                      ];
                                      next[i] = {
                                        ...policy,
                                        domain: e.target.value,
                                      };
                                      setForm({
                                        ...form,
                                        updateSecurityPolicies: next,
                                      });
                                    }}
                                    className="font-mono flex-1"
                                  />
                                  <Input
                                    placeholder="A, AAAA or ANY"
                                    value={policy.allowedTypes}
                                    onChange={(e) => {
                                      const next = [
                                        ...form.updateSecurityPolicies,
                                      ];
                                      next[i] = {
                                        ...policy,
                                        allowedTypes: e.target.value,
                                      };
                                      setForm({
                                        ...form,
                                        updateSecurityPolicies: next,
                                      });
                                    }}
                                    className="font-mono sm:w-[140px]"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      setForm({
                                        ...form,
                                        updateSecurityPolicies:
                                          form.updateSecurityPolicies.filter(
                                            (_, j) => j !== i,
                                          ),
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                  </section>
                </>
              )}

              {/* Internal zones expose nothing configurable */}
              {options.catalog === undefined &&
                options.queryAccess === undefined &&
                options.zoneTransfer === undefined &&
                options.notify === undefined &&
                options.update === undefined &&
                options.primaryNameServerAddresses === undefined && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <Badge variant="outline" className="mb-2">
                      {options.type}
                    </Badge>
                    <p>This zone has no configurable options.</p>
                  </div>
                )}
            </>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 z-10 bg-background px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading || !form}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
