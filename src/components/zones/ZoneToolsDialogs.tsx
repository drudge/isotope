import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cloneZone, convertZone, importZone } from "@/api/dns";
import { toast } from "sonner";
import type { Zone } from "@/types/api";

// Import records from a pasted or uploaded RFC 1035 zone file.
export function ZoneImportDialog({
  zone,
  onOpenChange,
  onImported,
}: {
  zone: Zone | null;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}) {
  const [zoneFileText, setZoneFileText] = useState("");
  const [overwrite, setOverwrite] = useState(true);
  const [overwriteZone, setOverwriteZone] = useState(false);
  const [overwriteSoaSerial, setOverwriteSoaSerial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setZoneFileText("");
      setOverwrite(true);
      setOverwriteZone(false);
      setOverwriteSoaSerial(false);
    }
    onOpenChange(open);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setZoneFileText(await file.text());
    } catch {
      toast.error("Could not read the selected file");
    }
  };

  const handleImport = async () => {
    if (!zone || !zoneFileText.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await importZone(zone.name, zoneFileText, {
        overwrite,
        overwriteZone,
        overwriteSoaSerial,
      });
      if (response.status === "ok") {
        toast.success(`Records imported into ${zone.name}`);
        handleOpenChange(false);
        onImported?.();
      } else {
        toast.error(response.errorMessage || "Failed to import zone");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import zone",
      );
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={!!zone} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Zone File</DialogTitle>
          <DialogDescription>
            Paste or upload records in standard zone file format for{" "}
            <span className="font-mono">{zone?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Textarea
            placeholder={`@\t3600\tIN\tA\t192.168.1.1\nwww\t3600\tIN\tCNAME\t@`}
            value={zoneFileText}
            onChange={(e) => setZoneFileText(e.target.value)}
            className="font-mono min-h-[180px] text-xs"
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zone,.txt,.db,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Load from file
            </Button>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="import-overwrite"
                checked={overwrite}
                onCheckedChange={(c) => setOverwrite(c === true)}
              />
              <Label
                htmlFor="import-overwrite"
                className="text-sm font-normal cursor-pointer"
              >
                Overwrite existing record sets for imported records
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="import-soa"
                checked={overwriteSoaSerial}
                onCheckedChange={(c) => setOverwriteSoaSerial(c === true)}
              />
              <Label
                htmlFor="import-soa"
                className="text-sm font-normal cursor-pointer"
              >
                Overwrite SOA serial with the imported value
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="import-wipe"
                checked={overwriteZone}
                onCheckedChange={(c) => setOverwriteZone(c === true)}
                className="mt-0.5"
              />
              <div>
                <Label
                  htmlFor="import-wipe"
                  className="text-sm font-normal cursor-pointer text-destructive"
                >
                  Delete all existing records before import
                </Label>
                <p className="text-xs text-muted-foreground">
                  Replaces the entire zone with the imported records.
                </p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isSubmitting || !zoneFileText.trim()}
          >
            {isSubmitting ? "Importing..." : "Import Records"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Clone an existing zone (with all records) into a new zone.
export function ZoneCloneDialog({
  zone,
  onOpenChange,
  onCloned,
}: {
  zone: Zone | null;
  onOpenChange: (open: boolean) => void;
  onCloned?: (newZone: string) => void;
}) {
  const [newZoneName, setNewZoneName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) setNewZoneName("");
    onOpenChange(open);
  };

  const handleClone = async () => {
    if (!zone || !newZoneName.trim()) return;
    setIsSubmitting(true);
    const target = newZoneName.trim();
    const response = await cloneZone(target, zone.name);
    if (response.status === "ok") {
      toast.success(`Cloned ${zone.name} to ${target}`);
      handleOpenChange(false);
      onCloned?.(target);
    } else {
      toast.error(response.errorMessage || "Failed to clone zone");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={!!zone} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone Zone</DialogTitle>
          <DialogDescription>
            Create a new zone with a copy of all records from{" "}
            <span className="font-mono">{zone?.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>New Zone Name</Label>
          <Input
            placeholder="copy.example.com"
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            className="font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleClone();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleClone}
            disabled={isSubmitting || !newZoneName.trim()}
          >
            {isSubmitting ? "Cloning..." : "Clone Zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CONVERT_TARGETS: Record<string, string[]> = {
  Primary: ["Secondary", "Forwarder"],
  Secondary: ["Primary", "Forwarder"],
  Forwarder: ["Primary", "Secondary"],
};

// Convert a zone from one type to another.
export function ZoneConvertDialog({
  zone,
  onOpenChange,
  onConverted,
}: {
  zone: Zone | null;
  onOpenChange: (open: boolean) => void;
  onConverted?: () => void;
}) {
  const [targetType, setTargetType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targets = zone ? (CONVERT_TARGETS[zone.type] ?? []) : [];

  const handleOpenChange = (open: boolean) => {
    if (!open) setTargetType("");
    onOpenChange(open);
  };

  const handleConvert = async () => {
    if (!zone || !targetType) return;
    setIsSubmitting(true);
    const response = await convertZone(zone.name, targetType);
    if (response.status === "ok") {
      toast.success(`Converted ${zone.name} to ${targetType} zone`);
      handleOpenChange(false);
      onConverted?.();
    } else {
      toast.error(response.errorMessage || "Failed to convert zone");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={!!zone} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Zone Type</DialogTitle>
          <DialogDescription>
            Change <span className="font-mono">{zone?.name}</span> from{" "}
            {zone?.type} to another zone type
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Convert To</Label>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger>
                <SelectValue placeholder="Select target type" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type} Zone
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Zone type conversion changes how the server answers for this zone.
            Converting to Secondary requires a reachable primary name server;
            review the zone settings afterwards.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={isSubmitting || !targetType}
          >
            {isSubmitting ? "Converting..." : "Convert Zone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
