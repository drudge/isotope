import { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Upload, Download, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

type ListType = 'blocked' | 'allowed';

interface DomainListProps {
  type: ListType;
  domains: string[];
  isLoading: boolean;
  onAdd: (domain: string) => Promise<void>;
  onDelete: (domain: string) => Promise<void>;
  onFlush: () => Promise<void>;
  onImport: (domains: string[]) => Promise<void>;
  onExport: () => void;
}

export function DomainList({
  type,
  domains,
  isLoading,
  onAdd,
  onDelete,
  onFlush,
  onImport,
  onExport,
}: DomainListProps) {
  const [filter, setFilter] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFlushOpen, setIsFlushOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const isBlocked = type === 'blocked';
  const Icon = isBlocked ? ShieldX : ShieldCheck;
  const iconColorClass = isBlocked
    ? 'text-red-600 dark:text-red-400'
    : 'text-green-600 dark:text-green-400';
  const badgeVariant = isBlocked ? 'destructive' : 'default';
  const badgeText = isBlocked ? 'blocked' : 'allowed';

  const filteredDomains = useMemo(() => {
    if (!filter) return domains;
    const lowerFilter = filter.toLowerCase();
    return domains.filter((d) => d.toLowerCase().includes(lowerFilter));
  }, [domains, filter]);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    setIsAdding(true);
    await onAdd(newDomain.trim());
    setNewDomain('');
    setIsAddOpen(false);
    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!domainToDelete) return;
    setIsDeleting(true);
    await onDelete(domainToDelete);
    setIsDeleting(false);
    setDomainToDelete(null);
  };

  const handleFlush = async () => {
    setIsFlushing(true);
    await onFlush();
    setIsFlushing(false);
    setIsFlushOpen(false);
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.hosts';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const importedDomains = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'));
      if (importedDomains.length > 0) {
        await onImport(importedDomains);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-6 w-16" />
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
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Domain
        </Button>
        <Button variant="outline" onClick={handleImportClick}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
        <Button variant="outline" onClick={onExport} disabled={domains.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button
          variant="destructive"
          onClick={() => setIsFlushOpen(true)}
          disabled={domains.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`Search ${type} domains...`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredDomains.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {filter
                ? `No ${type} domains match "${filter}"`
                : `No ${type} domains yet. Add your first domain to get started.`}
            </div>
          ) : (
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {filteredDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <Icon className={`h-4 w-4 ${iconColorClass} shrink-0`} />
                  <span className="font-mono text-sm flex-1 truncate">{domain}</span>
                  <Badge variant={badgeVariant} className="text-xs">
                    {badgeText}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDomainToDelete(domain)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {domains.length} {domains.length === 1 ? 'domain' : 'domains'} in {type} list
        {filter && filteredDomains.length !== domains.length && (
          <span> ({filteredDomains.length} shown)</span>
        )}
      </p>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {isBlocked ? 'Blocked' : 'Allowed'} Domain</DialogTitle>
            <DialogDescription>
              Enter a domain name to add to the {type} list.
              {isBlocked
                ? ' Use wildcards like *.example.com to block all subdomains.'
                : ' This domain will bypass blocking.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isAdding || !newDomain.trim()}>
              {isAdding ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!domainToDelete}
        onOpenChange={() => !isDeleting && setDomainToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{domainToDelete}" from the {type} list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isFlushOpen} onOpenChange={() => !isFlushing && setIsFlushOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All {isBlocked ? 'Blocked' : 'Allowed'} Domains?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {domains.length} domains from the {type} list. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFlushing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFlush}
              disabled={isFlushing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isFlushing ? 'Clearing...' : 'Clear All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
