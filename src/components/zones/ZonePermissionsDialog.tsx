import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { getZonePermissions, setZonePermissions } from "@/api/dns";
import { toast } from "sonner";
import type {
  Zone,
  ZoneGroupPermission,
  ZoneUserPermission,
} from "@/types/api";

interface PermissionRowProps {
  name: string;
  canView: boolean;
  canModify: boolean;
  canDelete: boolean;
  onChange: (perm: { canView: boolean; canModify: boolean; canDelete: boolean }) => void;
  onRemove: () => void;
}

function PermissionRow({
  name,
  canView,
  canModify,
  canDelete,
  onChange,
  onRemove,
}: PermissionRowProps) {
  return (
    <div className="flex items-center gap-2 py-2">
      <span className="flex-1 min-w-0 text-sm font-medium truncate">
        {name}
      </span>
      <div className="flex items-center gap-4 shrink-0">
        {(
          [
            ["View", canView, "canView"],
            ["Modify", canModify, "canModify"],
            ["Delete", canDelete, "canDelete"],
          ] as const
        ).map(([label, checked, key]) => (
          <div key={key} className="flex items-center space-x-1.5">
            <Checkbox
              id={`${name}-${key}`}
              checked={checked}
              onCheckedChange={(c) =>
                onChange({
                  canView,
                  canModify,
                  canDelete,
                  [key]: c === true,
                })
              }
            />
            <Label
              htmlFor={`${name}-${key}`}
              className="text-xs font-normal text-muted-foreground cursor-pointer"
            >
              {label}
            </Label>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AddPrincipalRow({
  placeholder,
  candidates,
  onAdd,
}: {
  placeholder: string;
  candidates: string[];
  onAdd: (name: string) => void;
}) {
  const [selected, setSelected] = useState("");

  if (candidates.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="flex-1 sm:max-w-[240px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selected}
        onClick={() => {
          onAdd(selected);
          setSelected("");
        }}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  );
}

export function ZonePermissionsDialog({
  zone,
  onOpenChange,
}: {
  zone: Zone | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [userPerms, setUserPerms] = useState<ZoneUserPermission[]>([]);
  const [groupPerms, setGroupPerms] = useState<ZoneGroupPermission[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!zone) return;

    let cancelled = false;
    setIsLoading(true);
    getZonePermissions(zone.name)
      .then((response) => {
        if (cancelled) return;
        if (response.status === "ok" && response.response) {
          setUserPerms(response.response.userPermissions ?? []);
          setGroupPerms(response.response.groupPermissions ?? []);
          setAllUsers(response.response.users ?? []);
          setAllGroups(response.response.groups ?? []);
        } else {
          toast.error(
            response.errorMessage || "Failed to load zone permissions",
          );
          onOpenChange(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load zone permissions",
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
    if (!zone) return;
    setIsSaving(true);
    const response = await setZonePermissions(zone.name, userPerms, groupPerms);
    if (response.status === "ok") {
      toast.success(`Permissions saved for ${zone.name}`);
      onOpenChange(false);
    } else {
      toast.error(response.errorMessage || "Failed to save permissions");
    }
    setIsSaving(false);
  };

  const unassignedUsers = allUsers.filter(
    (u) => !userPerms.some((p) => p.username === u),
  );
  const unassignedGroups = allGroups.filter(
    (g) => !groupPerms.some((p) => p.name === g),
  );

  return (
    <Dialog open={!!zone} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden"
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <DialogTitle>Zone Permissions</DialogTitle>
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

        {/* min-h-0 lets this flex child shrink so it scrolls instead of
            overflowing the dialog when content is taller than 90vh. */}
        <div className="overflow-y-auto px-6 py-4 flex-1 min-h-0 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              <section>
                <h3 className="text-sm font-medium mb-1">Groups</h3>
                {groupPerms.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    No group permissions set.
                  </p>
                )}
                <div className="divide-y">
                  {groupPerms.map((perm, i) => (
                    <PermissionRow
                      key={perm.name}
                      name={perm.name}
                      canView={perm.canView}
                      canModify={perm.canModify}
                      canDelete={perm.canDelete}
                      onChange={(next) => {
                        const list = [...groupPerms];
                        list[i] = { ...perm, ...next };
                        setGroupPerms(list);
                      }}
                      onRemove={() =>
                        setGroupPerms(groupPerms.filter((_, j) => j !== i))
                      }
                    />
                  ))}
                </div>
                <AddPrincipalRow
                  placeholder="Add group..."
                  candidates={unassignedGroups}
                  onAdd={(name) =>
                    setGroupPerms([
                      ...groupPerms,
                      { name, canView: true, canModify: false, canDelete: false },
                    ])
                  }
                />
              </section>

              <Separator />

              <section>
                <h3 className="text-sm font-medium mb-1">Users</h3>
                {userPerms.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">
                    No user permissions set.
                  </p>
                )}
                <div className="divide-y">
                  {userPerms.map((perm, i) => (
                    <PermissionRow
                      key={perm.username}
                      name={perm.username}
                      canView={perm.canView}
                      canModify={perm.canModify}
                      canDelete={perm.canDelete}
                      onChange={(next) => {
                        const list = [...userPerms];
                        list[i] = { ...perm, ...next };
                        setUserPerms(list);
                      }}
                      onRemove={() =>
                        setUserPerms(userPerms.filter((_, j) => j !== i))
                      }
                    />
                  ))}
                </div>
                <AddPrincipalRow
                  placeholder="Add user..."
                  candidates={unassignedUsers}
                  onAdd={(username) =>
                    setUserPerms([
                      ...userPerms,
                      {
                        username,
                        canView: true,
                        canModify: false,
                        canDelete: false,
                      },
                    ])
                  }
                />
              </section>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
