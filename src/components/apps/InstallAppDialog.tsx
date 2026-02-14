import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (name: string, file: File) => Promise<void>;
  processing: boolean;
}

export function InstallAppDialog({
  open,
  onOpenChange,
  onInstall,
  processing,
}: InstallAppDialogProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleInstall = async () => {
    if (!name.trim() || !file) return;
    await onInstall(name, file);
    setName('');
    setFile(null);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setName('');
      setFile(null);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install App from File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app-name">App Name</Label>
            <Input
              id="app-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My DNS App"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-file">App Zip File</Label>
            <Input
              id="app-file"
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleInstall}
            disabled={processing || !name.trim() || !file}
          >
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
