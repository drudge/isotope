import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ShieldCheck, Plus, Trash2, RefreshCw, Download, Upload, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApi } from '@/hooks/useApi';
import { listAllowedZones, addAllowedZone, deleteAllowedZone, flushAllowedZones } from '@/api/zones';
import { toast } from 'sonner';

export default function Allowed() {
  useDocumentTitle("Allowed");
  const [filter, setFilter] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFlushOpen, setIsFlushOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlushing, setIsFlushing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { data, isLoading, error, refetch } = useApi(() => listAllowedZones(), []);

  const zones = data?.zones ?? [];

  const filteredZones = zones.filter((zone) =>
    zone.toLowerCase().includes(filter.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    setIsAdding(true);

    const response = await addAllowedZone(newDomain.trim());

    if (response.status === 'ok') {
      toast.success(`"${newDomain}" added to allowed list`);
      setNewDomain('');
      setIsAddOpen(false);
      await refetch();
    } else {
      toast.error(response.errorMessage || 'Failed to add domain');
    }

    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!domainToDelete) return;
    setIsDeleting(true);

    const response = await deleteAllowedZone(domainToDelete);

    if (response.status === 'ok') {
      toast.success(`"${domainToDelete}" removed from allowed list`);
      refetch();
    } else {
      toast.error(response.errorMessage || 'Failed to delete domain');
    }

    setIsDeleting(false);
    setDomainToDelete(null);
  };

  const handleFlush = async () => {
    setIsFlushing(true);
    const response = await flushAllowedZones();

    if (response.status === 'ok') {
      toast.success('All allowed zones cleared');
      setIsFlushOpen(false);
      refetch();
    } else {
      toast.error(response.errorMessage || 'Failed to flush allowed zones');
    }
    setIsFlushing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Allowed Zones</h1>
        <p className="text-muted-foreground mt-1">
          Manage domains that are always allowed, bypassing any blocking rules
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main List (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats & Actions Card */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                    Allowed Zones
                  </CardTitle>
                  <CardDescription>
                    {zones.length} {zones.length === 1 ? 'domain' : 'domains'} in allowed list
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setIsFlushOpen(true)}
                  disabled={zones.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search allowed domains..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Zones List */}
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="divide-y">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-4 py-3">
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      ))}
                    </div>
                  ) : filteredZones.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      {filter ? `No allowed domains match "${filter}"` : 'No allowed domains yet. Add your first domain to get started.'}
                    </div>
                  ) : (
                    <div className="divide-y max-h-[600px] overflow-y-auto">
                      {filteredZones.map((zone) => (
                        <div
                          key={zone}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
                        >
                          <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                          <span className="font-mono text-sm flex-1">{zone}</span>
                          <Badge variant="secondary" className="text-xs">allowed</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setDomainToDelete(zone)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Info (1/3 width) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What are Allowed Zones?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Allowed zones are domains that will always be resolved normally, even if they would otherwise be blocked by blocking rules or blocklists.
              </p>
              <div className="pt-3 border-t space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Override blocking</p>
                    <p className="text-sm text-muted-foreground">
                      Bypass all blocklists and blocking rules
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Wildcard support</p>
                    <p className="text-sm text-muted-foreground">
                      Use *.example.com to allow all subdomains
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Higher priority</p>
                    <p className="text-sm text-muted-foreground">
                      Allowed zones take precedence over blocked zones
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allowed Domain</DialogTitle>
            <DialogDescription>
              Enter a domain name to add to the allowed list. Use wildcards like *.example.com to allow all subdomains.
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!domainToDelete} onOpenChange={() => !isDeleting && setDomainToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Allowed Domain?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{domainToDelete}" from the allowed list? This domain may be subject to blocking rules after removal.
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

      {/* Flush Confirmation */}
      <AlertDialog open={isFlushOpen} onOpenChange={() => !isFlushing && setIsFlushOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Allowed Zones?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {zones.length} domains from the allowed list. This action cannot be undone.
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
