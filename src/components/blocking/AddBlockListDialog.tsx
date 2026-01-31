import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddBlockListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (url: string) => Promise<void>;
  existingUrls: string[];
}

export function AddBlockListDialog({
  open,
  onOpenChange,
  onAdd,
  existingUrls,
}: AddBlockListDialogProps) {
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const validateUrl = (value: string): string | null => {
    if (!value.trim()) {
      return 'URL is required';
    }
    try {
      const parsed = new URL(value.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return 'URL must use HTTP or HTTPS';
      }
    } catch {
      return 'Invalid URL format';
    }
    if (existingUrls.includes(value.trim())) {
      return 'This block list is already added';
    }
    return null;
  };

  const handleAdd = async () => {
    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsAdding(true);
    setError('');
    try {
      await onAdd(url.trim());
      setUrl('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add block list');
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUrl('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Block List</DialogTitle>
          <DialogDescription>
            Enter the URL of a block list. The server will automatically download and update it periodically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="block-list-url">Block List URL</Label>
            <Input
              id="block-list-url"
              placeholder="https://example.com/blocklist.txt"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Supported formats:</p>
            <ul className="list-disc list-inside pl-2">
              <li>Standard hosts file format</li>
              <li>Plain text with one domain per line</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding || !url.trim()}>
            {isAdding ? 'Adding...' : 'Add Block List'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
