import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  KeyRound,
  MoreVertical,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CopyableText } from "@/components/ui/copyable-text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  activateKskDnsKey,
  addPrivateKey,
  convertToNsec,
  convertToNsec3,
  deletePrivateKey,
  getDnssecProperties,
  getDsInfo,
  publishAllPrivateKeys,
  retireDnsKey,
  rolloverDnsKey,
  signZone,
  unsignZone,
  updateDnsKeyTtl,
  updateNsec3Params,
  updatePrivateKey,
  type DnssecKeyAlgorithm,
} from "@/api/dnssec";
import type {
  DnssecDsInfo,
  DnssecKeyType,
  DnssecPrivateKey,
  DnssecProperties,
  Zone,
} from "@/types/api";

// Signing algorithm choices offered by the UI. The server accepts
// algorithm=RSA|ECDSA|EDDSA with a hash/curve; these values encode both.
const KEY_ALGORITHMS = [
  { value: "ECDSA-P256", label: "ECDSA P-256 (recommended)" },
  { value: "ECDSA-P384", label: "ECDSA P-384" },
  { value: "EDDSA-ED25519", label: "EdDSA Ed25519" },
  { value: "EDDSA-ED448", label: "EdDSA Ed448" },
  { value: "RSA-SHA256", label: "RSA SHA-256" },
  { value: "RSA-SHA512", label: "RSA SHA-512" },
];

const RSA_KEY_SIZES = ["1024", "2048", "3072", "4096"];

function parseKeyAlgorithm(value: string): DnssecKeyAlgorithm {
  const [algorithm, sub] = value.split("-");
  if (algorithm === "RSA") {
    return { algorithm: "RSA", hashAlgorithm: sub };
  }
  return { algorithm: algorithm as "ECDSA" | "EDDSA", curve: sub };
}

function keyStateBadgeClass(state?: string): string {
  switch (state) {
    case "Generated":
      return "border-dashed text-muted-foreground";
    case "Published":
      return "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400";
    case "Ready":
      return "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "Active":
      return "border-transparent bg-green-500/15 text-green-600 dark:text-green-400";
    default:
      // Retired, Revoked, or any state added by a future server version.
      return "border-transparent bg-red-500/15 text-red-600 dark:text-red-400";
  }
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? iso : date.toLocaleString();
}

interface ConfirmAction {
  title: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}

export function DnssecDialog({
  zone,
  onOpenChange,
  onChanged,
}: {
  zone: Zone | null;
  onOpenChange: (open: boolean) => void;
  // Called after any operation that changes the zone's dnssecStatus so the
  // parent can refetch the zones list (badges, list rows).
  onChanged: () => void;
}) {
  return (
    <Dialog open={!!zone} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {zone && <DnssecContent zone={zone} onChanged={onChanged} />}
      </DialogContent>
    </Dialog>
  );
}

function DnssecContent({
  zone,
  onChanged,
}: {
  zone: Zone;
  onChanged: () => void;
}) {
  const [properties, setProperties] = useState<DnssecProperties | null>(null);
  const [dsInfo, setDsInfo] = useState<DnssecDsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("keys");
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const refreshingRef = useRef(false);

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      if (!silent) setLoading(properties === null);
      try {
        const propsRes = await getDnssecProperties(zone.name);
        if (propsRes.status === "ok" && propsRes.response) {
          setProperties(propsRes.response);
          setError(null);
          if (propsRes.response.dnssecStatus !== "Unsigned") {
            const dsRes = await getDsInfo(zone.name);
            if (dsRes.status === "ok" && dsRes.response) {
              setDsInfo(dsRes.response);
            }
          } else {
            setDsInfo(null);
          }
        } else if (!silent) {
          setError(propsRes.errorMessage || "Failed to load DNSSEC properties");
        }
      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load DNSSEC properties",
          );
        }
      } finally {
        refreshingRef.current = false;
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zone.name],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Key states advance on the server over time (Published -> Ready -> Active),
  // so keep the view current while the dialog stays open.
  useEffect(() => {
    const id = window.setInterval(() => void refresh({ silent: true }), 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Runs an API action with a shared toast/refresh pattern. Actions that can
  // change dnssecStatus pass zonesChanged to also refetch the zones list.
  const runAction = async (
    action: () => Promise<{ status: string; errorMessage?: string }>,
    successMessage: string,
    { zonesChanged = false }: { zonesChanged?: boolean } = {},
  ): Promise<boolean> => {
    try {
      const response = await action();
      if (response.status === "ok") {
        toast.success(successMessage);
        await refresh({ silent: true });
        if (zonesChanged) onChanged();
        return true;
      }
      toast.error(response.errorMessage || "The operation failed");
      return false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The operation failed");
      return false;
    }
  };

  const signed = properties !== null && properties.dnssecStatus !== "Unsigned";

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
        <div className="flex items-center justify-between gap-4 pr-8">
          <div className="space-y-1.5 min-w-0">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <span className="truncate">DNSSEC — {zone.name}</span>
            </DialogTitle>
            <DialogDescription>
              {signed
                ? `Signed with ${properties.dnssecStatus === "SignedWithNSEC3" ? "NSEC3" : "NSEC"} proof of non-existence`
                : "Sign the zone to protect it against forged DNS responses"}
            </DialogDescription>
          </div>
          {signed && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => void refresh()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        ) : !signed ? (
          <SignWizard
            onSign={(options) =>
              runAction(
                () => signZone(zone.name, options),
                `Zone "${zone.name}" was signed`,
                { zonesChanged: true },
              ).then((ok) => {
                if (ok) setActiveTab("ds");
                return ok;
              })
            }
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="keys">Keys</TabsTrigger>
              <TabsTrigger value="ds">DS Records</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="keys" className="mt-4">
              <KeysTab
                properties={properties}
                zoneName={zone.name}
                runAction={runAction}
                setConfirm={setConfirm}
              />
            </TabsContent>

            <TabsContent value="ds" className="mt-4">
              <DsRecordsTab
                zoneName={zone.name}
                dsInfo={dsInfo}
                runAction={runAction}
                setConfirm={setConfirm}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <SettingsTab
                properties={properties}
                zoneName={zone.name}
                runAction={runAction}
                setConfirm={setConfirm}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !confirmBusy) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmBusy}
              className={
                confirm?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={async (e) => {
                e.preventDefault();
                if (!confirm) return;
                setConfirmBusy(true);
                await confirm.onConfirm();
                setConfirmBusy(false);
                setConfirm(null);
              }}
            >
              {confirm?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type RunAction = (
  action: () => Promise<{ status: string; errorMessage?: string }>,
  successMessage: string,
  options?: { zonesChanged?: boolean },
) => Promise<boolean>;

function AlgorithmFields({
  algorithm,
  onAlgorithmChange,
  rsaKeySize,
  onRsaKeySizeChange,
  rsaKeySizeLabel = "RSA Key Size",
}: {
  algorithm: string;
  onAlgorithmChange: (value: string) => void;
  rsaKeySize: string;
  onRsaKeySizeChange: (value: string) => void;
  rsaKeySizeLabel?: string;
}) {
  const isRsa = algorithm.startsWith("RSA");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Algorithm</Label>
        <Select value={algorithm} onValueChange={onAlgorithmChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KEY_ALGORITHMS.map((alg) => (
              <SelectItem key={alg.value} value={alg.value}>
                {alg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isRsa && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{rsaKeySizeLabel}</Label>
          <Select value={rsaKeySize} onValueChange={onRsaKeySizeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RSA_KEY_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size} bits
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function SignWizard({
  onSign,
}: {
  onSign: (
    options: Parameters<typeof signZone>[1],
  ) => Promise<boolean>;
}) {
  const [algorithm, setAlgorithm] = useState("ECDSA-P256");
  const [rsaKeySize, setRsaKeySize] = useState("2048");
  const [nxProof, setNxProof] = useState<"NSEC" | "NSEC3">("NSEC");
  const [iterations, setIterations] = useState("0");
  const [saltLength, setSaltLength] = useState("0");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dnsKeyTtl, setDnsKeyTtl] = useState("3600");
  const [zskRolloverDays, setZskRolloverDays] = useState("30");
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    setSigning(true);
    const key = parseKeyAlgorithm(algorithm);
    await onSign({
      ...key,
      ...(key.algorithm === "RSA"
        ? {
            kskKeySize: parseInt(rsaKeySize),
            zskKeySize: parseInt(rsaKeySize),
          }
        : {}),
      dnsKeyTtl: parseInt(dnsKeyTtl) || 3600,
      zskRolloverDays: parseInt(zskRolloverDays),
      nxProof,
      ...(nxProof === "NSEC3"
        ? {
            iterations: parseInt(iterations) || 0,
            saltLength: parseInt(saltLength) || 0,
          }
        : {}),
    });
    setSigning(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">How signing works</p>
        <p>
          Signing generates a Key Signing Key (KSK) and a Zone Signing Key
          (ZSK), publishes DNSKEY records, and signs every record in the zone.
          Afterwards, you complete the chain of trust by adding a DS record at
          your registrar — this dialog gives you the exact values to paste.
        </p>
      </div>

      <AlgorithmFields
        algorithm={algorithm}
        onAlgorithmChange={setAlgorithm}
        rsaKeySize={rsaKeySize}
        onRsaKeySizeChange={setRsaKeySize}
        rsaKeySizeLabel="KSK & ZSK Key Size"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Proof of Non-Existence</Label>
          <Select
            value={nxProof}
            onValueChange={(v) => setNxProof(v as "NSEC" | "NSEC3")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NSEC">NSEC</SelectItem>
              <SelectItem value="NSEC3">NSEC3</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            NSEC3 hashes record names to prevent zone walking.
          </p>
        </div>
        {nxProof === "NSEC3" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Iterations
              </Label>
              <Input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Salt Length
              </Label>
              <Input
                type="number"
                value={saltLength}
                onChange={(e) => setSaltLength(e.target.value)}
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground -mt-1">
              0 iterations and no salt is the modern recommendation (RFC 9276).
            </p>
          </div>
        )}
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          Advanced options
          {showAdvanced ? (
            <ChevronUp className="ml-1 h-3 w-3" />
          ) : (
            <ChevronDown className="ml-1 h-3 w-3" />
          )}
        </Button>
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                DNSKEY TTL (seconds)
              </Label>
              <Input
                type="number"
                value={dnsKeyTtl}
                onChange={(e) => setDnsKeyTtl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                ZSK Auto-Rollover (days, 0 disables)
              </Label>
              <Input
                type="number"
                value={zskRolloverDays}
                onChange={(e) => setZskRolloverDays(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Signing is safe to do at any time; resolvers only validate once the
          DS record exists at the parent zone.
        </p>
        <Button onClick={() => void handleSign()} disabled={signing}>
          <ShieldCheck className="h-4 w-4 mr-2" />
          {signing ? "Signing..." : "Sign Zone"}
        </Button>
      </div>
    </div>
  );
}

function KeysTab({
  properties,
  zoneName,
  runAction,
  setConfirm,
}: {
  properties: DnssecProperties;
  zoneName: string;
  runAction: RunAction;
  setConfirm: (confirm: ConfirmAction) => void;
}) {
  const [showAddKey, setShowAddKey] = useState(false);
  const [keyType, setKeyType] = useState<DnssecKeyType>("ZoneSigningKey");
  const [algorithm, setAlgorithm] = useState("ECDSA-P256");
  const [rsaKeySize, setRsaKeySize] = useState("2048");
  const [rolloverDays, setRolloverDays] = useState("30");
  const [adding, setAdding] = useState(false);
  const [rolloverEdit, setRolloverEdit] = useState<{
    keyTag: number;
    value: string;
  } | null>(null);
  const [savingRollover, setSavingRollover] = useState(false);

  const keys = properties.dnssecPrivateKeys;
  const hasGenerated = keys.some((k) => k.state === "Generated");

  const handleAddKey = async () => {
    setAdding(true);
    const key = parseKeyAlgorithm(algorithm);
    const ok = await runAction(
      () =>
        addPrivateKey(zoneName, {
          keyType,
          ...key,
          ...(key.algorithm === "RSA"
            ? { keySize: parseInt(rsaKeySize) }
            : {}),
          rolloverDays: parseInt(rolloverDays) || 0,
        }),
      "Private key was generated",
    );
    setAdding(false);
    if (ok) setShowAddKey(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {keys.length} {keys.length === 1 ? "key" : "keys"}
        </p>
        <div className="flex items-center gap-2">
          {hasGenerated && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void runAction(
                  () => publishAllPrivateKeys(zoneName),
                  "Generated keys were published",
                )
              }
            >
              <Upload className="h-4 w-4 mr-2" />
              Publish Generated Keys
            </Button>
          )}
          <Button
            variant={showAddKey ? "secondary" : "default"}
            size="sm"
            onClick={() => setShowAddKey(!showAddKey)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Key
          </Button>
        </div>
      </div>

      {showAddKey && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Key Type</Label>
              <Select
                value={keyType}
                onValueChange={(v) => {
                  const type = v as DnssecKeyType;
                  setKeyType(type);
                  setRolloverDays(type === "ZoneSigningKey" ? "30" : "0");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZoneSigningKey">
                    Zone Signing Key (ZSK)
                  </SelectItem>
                  <SelectItem value="KeySigningKey">
                    Key Signing Key (KSK)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Auto-Rollover (days, 0 disables)
              </Label>
              <Input
                type="number"
                value={rolloverDays}
                onChange={(e) => setRolloverDays(e.target.value)}
              />
            </div>
          </div>
          <AlgorithmFields
            algorithm={algorithm}
            onAlgorithmChange={setAlgorithm}
            rsaKeySize={rsaKeySize}
            onRsaKeySizeChange={setRsaKeySize}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddKey(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleAddKey()} disabled={adding}>
              {adding ? "Generating..." : "Generate Key"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            New keys start in the Generated state. Publish them to add their
            DNSKEY records to the zone; they then activate automatically (KSKs
            wait for their DS record before turning Active).
          </p>
        </div>
      )}

      <div className="rounded-lg border divide-y">
        {keys.map((key) => (
          <KeyRow
            key={key.keyTag}
            dnssecKey={key}
            zoneName={zoneName}
            runAction={runAction}
            setConfirm={setConfirm}
            onEditRollover={() =>
              setRolloverEdit({
                keyTag: key.keyTag,
                value: String(key.rolloverDays),
              })
            }
          />
        ))}
        {keys.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No private keys
          </div>
        )}
      </div>

      <Dialog
        open={rolloverEdit !== null}
        onOpenChange={(open) => {
          if (!open) setRolloverEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Auto-Rollover Period</DialogTitle>
            <DialogDescription>
              Days between automatic rollovers for key {rolloverEdit?.keyTag}.
              Use 0 to disable automatic rollover.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            value={rolloverEdit?.value ?? ""}
            onChange={(e) =>
              setRolloverEdit(
                rolloverEdit
                  ? { ...rolloverEdit, value: e.target.value }
                  : null,
              )
            }
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRolloverEdit(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={savingRollover}
              onClick={async () => {
                if (!rolloverEdit) return;
                setSavingRollover(true);
                const ok = await runAction(
                  () =>
                    updatePrivateKey(
                      zoneName,
                      rolloverEdit.keyTag,
                      parseInt(rolloverEdit.value) || 0,
                    ),
                  "Rollover period was updated",
                );
                setSavingRollover(false);
                if (ok) setRolloverEdit(null);
              }}
            >
              {savingRollover ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KeyRow({
  dnssecKey: key,
  zoneName,
  runAction,
  setConfirm,
  onEditRollover,
}: {
  dnssecKey: DnssecPrivateKey;
  zoneName: string;
  runAction: RunAction;
  setConfirm: (confirm: ConfirmAction) => void;
  onEditRollover: () => void;
}) {
  const isKsk = key.keyType === "KeySigningKey";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Badge
        variant="secondary"
        className="w-12 justify-center font-mono text-xs shrink-0"
      >
        {isKsk ? "KSK" : "ZSK"}
      </Badge>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm">{key.keyTag}</span>
          <span className="text-xs text-muted-foreground">{key.algorithm}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {key.state === "Published" && (key.stateReadyBy || key.stateActiveBy)
            ? `${isKsk ? "Ready" : "Active"} by ${formatDate(key.stateReadyBy || key.stateActiveBy)}`
            : `Since ${formatDate(key.stateChangedOn)}`}
          {key.rolloverDays > 0 && ` · rollover every ${key.rolloverDays}d`}
        </div>
      </div>
      {key.isRetiring && (
        <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
          Retiring
        </Badge>
      )}
      <Badge
        variant="outline"
        className={`text-xs shrink-0 ${keyStateBadgeClass(key.state)}`}
      >
        {key.state}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isKsk && key.state === "Ready" && (
            <DropdownMenuItem
              onClick={() =>
                void runAction(
                  () => activateKskDnsKey(zoneName, key.keyTag),
                  `KSK ${key.keyTag} was activated`,
                )
              }
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Activate Now
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onEditRollover}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto-Rollover Period
          </DropdownMenuItem>
          {(key.state === "Ready" || key.state === "Active") && (
            <DropdownMenuItem
              onClick={() =>
                setConfirm({
                  title: `Rollover key ${key.keyTag}?`,
                  description: `A new ${isKsk ? "KSK" : "ZSK"} will be generated and published. The old key is retired and removed automatically once the new key is active${isKsk ? " — remember to update the DS record at your registrar for the new KSK" : ""}.`,
                  actionLabel: "Rollover",
                  onConfirm: async () => {
                    await runAction(
                      () => rolloverDnsKey(zoneName, key.keyTag),
                      `Rollover started for key ${key.keyTag}`,
                    );
                  },
                })
              }
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Rollover
            </DropdownMenuItem>
          )}
          {key.state === "Generated" ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() =>
                  setConfirm({
                    title: `Delete key ${key.keyTag}?`,
                    description:
                      "The generated private key will be permanently deleted. It has not been published, so the zone is unaffected.",
                    actionLabel: "Delete",
                    destructive: true,
                    onConfirm: async () => {
                      await runAction(
                        () => deletePrivateKey(zoneName, key.keyTag),
                        `Key ${key.keyTag} was deleted`,
                      );
                    },
                  })
                }
              >
                Delete
              </DropdownMenuItem>
            </>
          ) : (
            !key.isRetiring && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() =>
                    setConfirm({
                      title: `Retire key ${key.keyTag}?`,
                      description:
                        "The key and its DNSKEY record will be removed safely. At least one other active key must exist for the zone to stay signed.",
                      actionLabel: "Retire",
                      destructive: true,
                      onConfirm: async () => {
                        await runAction(
                          () => retireDnsKey(zoneName, key.keyTag),
                          `Key ${key.keyTag} is being retired`,
                        );
                      },
                    })
                  }
                >
                  Retire
                </DropdownMenuItem>
              </>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DsRecordsTab({
  zoneName,
  dsInfo,
  runAction,
  setConfirm,
}: {
  zoneName: string;
  dsInfo: DnssecDsInfo | null;
  runAction: RunAction;
  setConfirm: (confirm: ConfirmAction) => void;
}) {
  if (!dsInfo) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        DS information is not available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">
          Complete the chain of trust
        </p>
        <p>
          Add a DS record at your registrar (or parent zone) for each key
          below — SHA-256 is the most widely supported digest. Once the server
          detects the published DS record, the key turns Active automatically;
          you can also activate it manually after publishing.
        </p>
      </div>

      {dsInfo.dsRecords.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No key signing keys found
        </div>
      )}

      {dsInfo.dsRecords.map((ds) => (
        <div key={ds.keyTag} className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Key Tag</span>
            <span className="font-mono text-sm">{ds.keyTag}</span>
            <span className="text-xs text-muted-foreground">
              {ds.algorithm} ({ds.algorithmNumber})
            </span>
            {ds.isRetiring && (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                Retiring
              </Badge>
            )}
            {ds.dnsKeyState && (
              <Badge
                variant="outline"
                className={`text-xs ${keyStateBadgeClass(ds.dnsKeyState)}`}
              >
                {ds.dnsKeyState}
              </Badge>
            )}
            {ds.dnsKeyState === "Ready" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 ml-auto"
                onClick={() =>
                  setConfirm({
                    title: `Activate KSK ${ds.keyTag}?`,
                    description:
                      "Only activate after the DS record is published at the parent zone. Activating early can make the zone fail validation.",
                    actionLabel: "Activate",
                    onConfirm: async () => {
                      await runAction(
                        () => activateKskDnsKey(zoneName, ds.keyTag),
                        `KSK ${ds.keyTag} was activated`,
                      );
                    },
                  })
                }
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Activate
              </Button>
            )}
          </div>

          {ds.dnsKeyState === "Published" && ds.dnsKeyStateReadyBy && (
            <p className="text-xs text-muted-foreground">
              This key becomes Ready by {formatDate(ds.dnsKeyStateReadyBy)};
              you can add the DS record at your registrar right away.
            </p>
          )}

          <div className="space-y-2">
            {ds.digests.map((digest) => (
              <div key={digest.digestType} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  DS record ({digest.digestType})
                </Label>
                <CopyableText
                  text={`${zoneName}. 3600 IN DS ${ds.keyTag} ${ds.algorithmNumber} ${digest.digestTypeNumber} ${digest.digest}`}
                  className="font-mono text-xs break-all rounded-md border bg-muted/40 px-3 py-2 w-full"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Public key (DNSKEY)
              </Label>
              <CopyableText
                text={ds.publicKey}
                className="font-mono text-xs break-all rounded-md border bg-muted/40 px-3 py-2 w-full"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({
  properties,
  zoneName,
  runAction,
  setConfirm,
}: {
  properties: DnssecProperties;
  zoneName: string;
  runAction: RunAction;
  setConfirm: (confirm: ConfirmAction) => void;
}) {
  const [ttl, setTtl] = useState(String(properties.dnsKeyTtl));
  const [savingTtl, setSavingTtl] = useState(false);
  const [iterations, setIterations] = useState(
    String(properties.nsec3Iterations ?? 0),
  );
  const [saltLength, setSaltLength] = useState(
    String(properties.nsec3SaltLength ?? 0),
  );
  const [savingNsec3, setSavingNsec3] = useState(false);

  const isNsec3 = properties.dnssecStatus === "SignedWithNSEC3";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">DNSKEY TTL (seconds)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            className="max-w-[180px]"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={savingTtl || parseInt(ttl) === properties.dnsKeyTtl}
            onClick={async () => {
              setSavingTtl(true);
              await runAction(
                () => updateDnsKeyTtl(zoneName, parseInt(ttl) || 3600),
                "DNSKEY TTL was updated",
              );
              setSavingTtl(false);
            }}
          >
            {savingTtl ? "Saving..." : "Save"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Can only be changed while all keys are in the Ready or Active state.
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Proof of Non-Existence</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Currently using {isNsec3 ? "NSEC3" : "NSEC"}.
          </p>
        </div>

        {isNsec3 && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Iterations
              </Label>
              <Input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(e.target.value)}
                className="w-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Salt Length
              </Label>
              <Input
                type="number"
                value={saltLength}
                onChange={(e) => setSaltLength(e.target.value)}
                className="w-[120px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              disabled={savingNsec3}
              onClick={async () => {
                setSavingNsec3(true);
                await runAction(
                  () =>
                    updateNsec3Params(
                      zoneName,
                      parseInt(iterations) || 0,
                      parseInt(saltLength) || 0,
                    ),
                  "NSEC3 parameters were updated",
                );
                setSavingNsec3(false);
              }}
            >
              {savingNsec3 ? "Saving..." : "Update"}
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setConfirm(
              isNsec3
                ? {
                    title: "Convert to NSEC?",
                    description:
                      "The zone will be re-signed using NSEC proof of non-existence. NSEC allows zone walking (enumerating all names in the zone).",
                    actionLabel: "Convert",
                    onConfirm: async () => {
                      await runAction(
                        () => convertToNsec(zoneName),
                        "Zone was converted to NSEC",
                        { zonesChanged: true },
                      );
                    },
                  }
                : {
                    title: "Convert to NSEC3?",
                    description:
                      "The zone will be re-signed using NSEC3 proof of non-existence, which hashes record names to prevent zone walking.",
                    actionLabel: "Convert",
                    onConfirm: async () => {
                      await runAction(
                        () => convertToNsec3(zoneName, 0, 0),
                        "Zone was converted to NSEC3",
                        { zonesChanged: true },
                      );
                    },
                  },
            )
          }
        >
          Convert to {isNsec3 ? "NSEC" : "NSEC3"}
        </Button>
      </div>

      <Separator />

      <div className="rounded-lg border border-destructive/40 p-4 space-y-2">
        <p className="text-sm font-medium">Unsign zone</p>
        <p className="text-xs text-muted-foreground">
          Removes all DNSSEC signatures and private keys from the zone. Remove
          the DS record at your registrar first, or validating resolvers will
          fail to resolve the zone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() =>
            setConfirm({
              title: `Unsign ${zoneName}?`,
              description:
                "All RRSIG, DNSKEY, and NSEC/NSEC3 records will be removed and every private key deleted. If a DS record still exists at the parent zone, validating resolvers will treat the zone as bogus.",
              actionLabel: "Unsign Zone",
              destructive: true,
              onConfirm: async () => {
                await runAction(
                  () => unsignZone(zoneName),
                  `Zone "${zoneName}" was unsigned`,
                  { zonesChanged: true },
                );
              },
            })
          }
        >
          Unsign Zone
        </Button>
      </div>
    </div>
  );
}
