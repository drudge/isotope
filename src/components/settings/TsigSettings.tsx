import { useState } from 'react';
import { Save, Key, Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { DnsSettings, DnsSettingsUpdate, TsigKey, TsigAlgorithm } from '@/types/settings';

interface TsigSettingsProps {
  settings: DnsSettings | undefined;
  isLoading: boolean;
  onSave: (updates: DnsSettingsUpdate) => Promise<boolean>;
}

const TSIG_ALGORITHMS: { value: TsigAlgorithm; label: string }[] = [
  { value: 'hmac-sha256', label: 'HMAC-SHA256 (Recommended)' },
  { value: 'hmac-sha512', label: 'HMAC-SHA512' },
  { value: 'hmac-sha384', label: 'HMAC-SHA384' },
  { value: 'hmac-sha256-128', label: 'HMAC-SHA256-128' },
  { value: 'hmac-sha384-192', label: 'HMAC-SHA384-192' },
  { value: 'hmac-sha512-256', label: 'HMAC-SHA512-256' },
  { value: 'hmac-sha1', label: 'HMAC-SHA1' },
  { value: 'hmac-md5.sig-alg.reg.int', label: 'HMAC-MD5 (Legacy)' },
];

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export default function TsigSettings({
  settings,
  isLoading,
  onSave,
}: TsigSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  // New key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState('');
  const [newKeyAlgorithm, setNewKeyAlgorithm] = useState<TsigAlgorithm>('hmac-sha256');

  const tsigKeys = settings?.tsigKeys ?? [];

  const handleAddKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Key name is required');
      return;
    }
    if (!newKeySecret.trim()) {
      toast.error('Shared secret is required');
      return;
    }

    // Check for duplicate key name
    if (tsigKeys.some((k) => k.keyName === newKeyName.trim())) {
      toast.error('A key with this name already exists');
      return;
    }

    setIsSaving(true);
    const newKey: TsigKey = {
      keyName: newKeyName.trim(),
      sharedSecret: newKeySecret.trim(),
      algorithmName: newKeyAlgorithm,
    };

    const success = await onSave({
      tsigKeys: [...tsigKeys, newKey],
    });

    if (success) {
      setShowAddDialog(false);
      setNewKeyName('');
      setNewKeySecret('');
      setNewKeyAlgorithm('hmac-sha256');
    }
    setIsSaving(false);
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;

    setIsSaving(true);
    const success = await onSave({
      tsigKeys: tsigKeys.filter((k) => k.keyName !== keyToDelete),
    });

    if (success) {
      setKeyToDelete(null);
    }
    setIsSaving(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                TSIG Keys
              </CardTitle>
              <CardDescription>
                Transaction Signature keys for secure zone transfers and dynamic updates
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tsigKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No TSIG keys configured</p>
              <p className="text-sm">Add a key to enable authenticated zone transfers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tsigKeys.map((key) => (
                <div
                  key={key.keyName}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium font-mono">{key.keyName}</div>
                    <div className="text-sm text-muted-foreground">
                      {TSIG_ALGORITHMS.find((a) => a.value === key.algorithmName)?.label ||
                        key.algorithmName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(key.sharedSecret)}
                      title="Copy secret"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setKeyToDelete(key.keyName)}
                      className="text-destructive hover:text-destructive"
                      title="Delete key"
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

      {/* Add Key Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add TSIG Key</DialogTitle>
            <DialogDescription>
              Create a new TSIG key for secure zone transfers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., transfer-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select
                value={newKeyAlgorithm}
                onValueChange={(value) => setNewKeyAlgorithm(value as TsigAlgorithm)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TSIG_ALGORITHMS.map((alg) => (
                    <SelectItem key={alg.value} value={alg.value}>
                      {alg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="secret">Shared Secret (Base64)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewKeySecret(generateSecret())}
                >
                  Generate
                </Button>
              </div>
              <Input
                id="secret"
                value={newKeySecret}
                onChange={(e) => setNewKeySecret(e.target.value)}
                placeholder="Base64-encoded secret"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKey} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Adding...' : 'Add Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete TSIG Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the key "{keyToDelete}"? This action cannot be undone
              and may break zone transfers using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              disabled={isSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
