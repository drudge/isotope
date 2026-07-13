import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  DatabaseBackup,
  Loader2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  backupSettings,
  restoreSettings,
  type BackupComponents,
} from '@/api/settings';
import { saveBlob } from '@/lib/utils';

interface BackupRestoreProps {
  /** Called after a successful restore so the parent can refetch settings. */
  onRestored?: () => void;
}

type ComponentKey = keyof BackupComponents;

interface ComponentMeta {
  key: ComponentKey;
  label: string;
  description: string;
}

const COMPONENTS: ComponentMeta[] = [
  {
    key: 'dnsSettings',
    label: 'DNS Settings',
    description: 'Core server configuration: recursion, forwarders, caching, and blocking options',
  },
  {
    key: 'zones',
    label: 'Zones',
    description: 'All hosted zones and their DNS records',
  },
  {
    key: 'allowedZones',
    label: 'Allowed Zones',
    description: 'Domains explicitly allowed to bypass blocking',
  },
  {
    key: 'blockedZones',
    label: 'Blocked Zones',
    description: 'Domains you have manually blocked',
  },
  {
    key: 'blockLists',
    label: 'Block Lists Cache',
    description: 'Downloaded block list files cached by the server',
  },
  {
    key: 'apps',
    label: 'DNS Apps',
    description: 'Installed DNS apps and their configuration',
  },
  {
    key: 'scopes',
    label: 'DHCP Scopes',
    description: 'DHCP scope definitions and reservations',
  },
  {
    key: 'authConfig',
    label: 'Auth Config',
    description: 'Users, groups, permissions, and active sessions',
  },
  {
    key: 'webServiceSettings',
    label: 'Web Service Settings',
    description: 'Web console addresses, ports, and TLS configuration',
  },
  {
    key: 'logSettings',
    label: 'Log Settings',
    description: 'Logging configuration such as log folder and retention',
  },
  {
    key: 'clusterConfig',
    label: 'Cluster Config',
    description: 'Clustering configuration for this node',
  },
  {
    key: 'stats',
    label: 'Stats',
    description: 'Dashboard statistics files. Can make the archive much larger.',
  },
  {
    key: 'logs',
    label: 'Log Files',
    description: 'Server log files. Can make the archive much larger.',
  },
];

const BACKUP_DEFAULTS: BackupComponents = {
  dnsSettings: true,
  zones: true,
  allowedZones: true,
  blockedZones: true,
  apps: true,
  scopes: true,
  authConfig: true,
};

const RESTORE_DEFAULTS: BackupComponents = {
  dnsSettings: true,
  zones: true,
};

const ALL_SELECTED: BackupComponents = Object.fromEntries(
  COMPONENTS.map((c) => [c.key, true])
);

function selectedComponents(selection: BackupComponents): ComponentMeta[] {
  return COMPONENTS.filter((c) => selection[c.key]);
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Backup/restore require delete permission on the Settings section; make the
// server's generic denial actionable.
function describeError(message: string): string {
  if (/access.*denied|denied.*access/i.test(message)) {
    return `${message} — backup and restore require delete permission on the Settings section.`;
  }
  return message;
}

interface ComponentChecklistProps {
  idPrefix: string;
  selection: BackupComponents;
  onChange: (selection: BackupComponents) => void;
  disabled?: boolean;
}

function ComponentChecklist({
  idPrefix,
  selection,
  onChange,
  disabled,
}: ComponentChecklistProps) {
  const selectedCount = selectedComponents(selection).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedCount} of {COMPONENTS.length} components selected
        </p>
        <div className="flex items-center gap-1 text-xs">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => onChange({ ...ALL_SELECTED })}
            disabled={disabled}
          >
            Select all
          </Button>
          <span className="text-muted-foreground">/</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => onChange({})}
            disabled={disabled}
          >
            none
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {COMPONENTS.map((component) => {
          const id = `${idPrefix}-${component.key}`;
          return (
            <div
              key={component.key}
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
            >
              <Checkbox
                id={id}
                className="mt-0.5"
                checked={!!selection[component.key]}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onChange({ ...selection, [component.key]: checked === true })
                }
              />
              <div className="space-y-0.5 min-w-0">
                <Label htmlFor={id} className="cursor-pointer">
                  {component.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {component.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BackupRestore({ onRestored }: BackupRestoreProps) {
  // Backup card state
  const [backupSelection, setBackupSelection] =
    useState<BackupComponents>(BACKUP_DEFAULTS);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Restore card state
  const [restoreSelection, setRestoreSelection] =
    useState<BackupComponents>(RESTORE_DEFAULTS);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [deleteExistingFiles, setDeleteExistingFiles] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backupCount = selectedComponents(backupSelection).length;
  const restoreComponents = selectedComponents(restoreSelection);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const { blob, filename } = await backupSettings(backupSelection);
      saveBlob(blob, filename);
      toast.success('Backup downloaded');
    } catch (error) {
      toast.error(
        describeError(
          error instanceof Error ? error.message : 'Failed to create backup'
        )
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    setIsRestoring(true);
    try {
      const response = await restoreSettings(
        restoreFile,
        restoreSelection,
        deleteExistingFiles
      );
      if (response.status === 'ok') {
        setShowConfirm(false);
        setRestoreFile(null);
        setDeleteExistingFiles(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success('Backup restored successfully', {
          description:
            'Server settings have changed. Reload the page to pick up the restored configuration.',
          duration: 10000,
          action: {
            label: 'Reload',
            onClick: () => window.location.reload(),
          },
        });
        onRestored?.();
      } else {
        toast.error(
          describeError(response.errorMessage || 'Failed to restore backup')
        );
      }
    } catch (error) {
      toast.error(
        describeError(
          error instanceof Error ? error.message : 'Failed to restore backup'
        )
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5" />
            Backup
          </CardTitle>
          <CardDescription>
            Download a zip archive of the selected server components. Keep it
            somewhere safe — it can contain credentials and TSIG secrets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ComponentChecklist
            idPrefix="backup"
            selection={backupSelection}
            onChange={setBackupSelection}
            disabled={isBackingUp}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleBackup}
              disabled={isBackingUp || backupCount === 0}
            >
              {isBackingUp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isBackingUp ? 'Preparing Backup...' : 'Download Backup'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Restore */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-destructive" />
            Restore
          </CardTitle>
          <CardDescription>
            Upload a backup zip and overwrite the selected components on this
            server. Only components you check below are restored.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Caution:</strong> Restoring overwrites the selected
              components immediately and may change users, sessions, and server
              behavior. You could be signed out if the auth config is restored.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restore-file">Backup Zip File</Label>
            <Input
              id="restore-file"
              ref={fileInputRef}
              type="file"
              accept=".zip"
              disabled={isRestoring}
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
            />
            {restoreFile && (
              <p className="text-xs text-muted-foreground">
                {restoreFile.name} ({formatFileSize(restoreFile.size)})
              </p>
            )}
          </div>

          <ComponentChecklist
            idPrefix="restore"
            selection={restoreSelection}
            onChange={setRestoreSelection}
            disabled={isRestoring}
          />

          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
            <div className="space-y-0.5">
              <Label htmlFor="delete-existing">Delete existing files</Label>
              <p className="text-xs text-muted-foreground">
                Delete the server's existing files for the selected components
                before restoring, so they exactly match the backup. Anything
                not in the backup is permanently removed.
              </p>
            </div>
            <Switch
              id="delete-existing"
              checked={deleteExistingFiles}
              disabled={isRestoring}
              onCheckedChange={setDeleteExistingFiles}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={
                isRestoring || !restoreFile || restoreComponents.length === 0
              }
            >
              {isRestoring ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation */}
      <AlertDialog
        open={showConfirm}
        onOpenChange={(open) => {
          if (!isRestoring) setShowConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore backup?</AlertDialogTitle>
            <AlertDialogDescription>
              The server will overwrite the components below with the contents
              of "{restoreFile?.name}". This takes effect immediately and
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1.5">Components to restore</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {restoreComponents.map((component) => (
                  <li
                    key={component.key}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {component.label}
                  </li>
                ))}
              </ul>
            </div>

            {deleteExistingFiles && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  Existing files for these components will be deleted first.
                  Anything not present in the backup is permanently removed.
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {isRestoring ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
