import { useState } from 'react';
import { Plus, Trash2, ExternalLink, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AddBlockListDialog } from './AddBlockListDialog';
import type { BlockingSettings } from '@/types/api';

interface BlockListManagerProps {
  settings: BlockingSettings | null;
  isLoading: boolean;
  onAddUrl: (url: string) => Promise<void>;
  onRemoveUrl: (url: string) => Promise<void>;
  onUpdateInterval: (hours: number) => Promise<void>;
}

export function BlockListManager({
  settings,
  isLoading,
  onAddUrl,
  onRemoveUrl,
  onUpdateInterval,
}: BlockListManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [urlToRemove, setUrlToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [intervalValue, setIntervalValue] = useState<string>('');

  const urls = settings?.blockListUrls ?? [];
  const updateInterval = settings?.blockListUpdateIntervalHours ?? 24;

  const handleRemove = async () => {
    if (!urlToRemove) return;
    setIsRemoving(true);
    await onRemoveUrl(urlToRemove);
    setIsRemoving(false);
    setUrlToRemove(null);
  };

  const handleIntervalBlur = async () => {
    const hours = parseInt(intervalValue, 10);
    if (!isNaN(hours) && hours > 0 && hours !== updateInterval) {
      await onUpdateInterval(hours);
    }
    setIntervalValue('');
  };

  const getUrlDisplayName = (url: string): string => {
    try {
      const parsed = new URL(url);
      return parsed.hostname + parsed.pathname;
    } catch {
      return url;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Block List
        </Button>
        <div className="flex items-center gap-2">
          <Label htmlFor="update-interval" className="text-sm whitespace-nowrap">
            Update every
          </Label>
          <Input
            id="update-interval"
            type="number"
            min={1}
            className="w-20"
            placeholder={String(updateInterval)}
            value={intervalValue}
            onChange={(e) => setIntervalValue(e.target.value)}
            onBlur={handleIntervalBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
          />
          <span className="text-sm text-muted-foreground">hours</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {urls.length === 0 ? (
            <div className="py-12 text-center">
              <List className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No block lists configured
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add a block list URL to start blocking domains automatically
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {urls.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <List className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm truncate" title={url}>
                      {getUrlDisplayName(url)}
                    </p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => setUrlToRemove(url)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddBlockListDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={onAddUrl}
        existingUrls={urls}
      />

      <AlertDialog open={!!urlToRemove} onOpenChange={() => !isRemoving && setUrlToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Block List?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this block list? Domains from this list will no longer be blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
