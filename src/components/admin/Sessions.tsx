import { useEffect, useState } from 'react';
import { Trash2, Plus, Copy, Check } from 'lucide-react';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyableText } from '@/components/ui/copyable-text';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listSessions, deleteSession, createToken, type Session } from '@/api/sessions';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [createTokenOpen, setCreateTokenOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [expirationDays, setExpirationDays] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await listSessions();
      if (response.status === 'ok' && response.response) {
        setSessions(response.response.sessions || []);
      } else {
        toast.error('Failed to load sessions');
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (partialToken: string) => {
    try {
      const response = await deleteSession(partialToken);
      if (response.status === 'ok') {
        toast.success('Session deleted');
        fetchSessions();
      } else {
        toast.error('Failed to delete session');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleCreateToken = async () => {
    if (!tokenName.trim()) {
      toast.error('Token name is required');
      return;
    }

    try {
      const expiration = expirationDays ? parseInt(expirationDays) : undefined;
      const response = await createToken('admin', tokenName, expiration);
      if (response.status === 'ok' && response.response) {
        setGeneratedToken(response.response.token);
        setTokenName('');
        setExpirationDays('');
        toast.success('API token created');
        fetchSessions();
      } else {
        toast.error('Failed to create token');
      }
    } catch (error) {
      console.error('Failed to create token:', error);
      toast.error('Failed to create token');
    }
  };

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
      toast.success('Token copied to clipboard');
    }
  };

  const closeTokenDialog = () => {
    setCreateTokenOpen(false);
    setGeneratedToken(null);
    setTokenCopied(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IsotopeSpinner size="md" className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Active Sessions</h2>
              {sessions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Total: {sessions.length}
                </span>
              )}
            </div>
            <Button onClick={() => setCreateTokenOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Token
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="font-medium">No active sessions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Remote Address</TableHead>
                    <TableHead>User Agent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.partialToken}>
                      <TableCell className="font-medium">{session.username}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-xs">
                            [{session.partialToken}]
                            {session.isCurrentSession && (
                              <span className="ml-2 text-xs text-green-600 dark:text-green-400">(current)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                session.type === 'ApiToken'
                                  ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted'
                              }
                            >
                              {session.type === 'ApiToken' ? 'API Token' : 'Standard'}
                            </span>
                            {session.tokenName && (
                              <span className="text-xs text-muted-foreground">{session.tokenName}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {new Date(session.lastSeen).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ({formatDistanceToNow(new Date(session.lastSeen), { addSuffix: true })})
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <CopyableText text={session.lastSeenRemoteAddress} showIcon={false} />
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={session.lastSeenUserAgent}>
                        {session.lastSeenUserAgent}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(session.partialToken)}
                          disabled={session.isCurrentSession}
                          className="gap-2 text-destructive hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this session? The user will be logged out immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Token Dialog */}
      <Dialog open={createTokenOpen} onOpenChange={closeTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Token</DialogTitle>
            <DialogDescription>
              Generate a new API token for programmatic access to the DNS server.
            </DialogDescription>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your API token has been created. Copy it now as it won't be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={generatedToken}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToken}
                    className="shrink-0"
                  >
                    {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeTokenDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Token Name</Label>
                <Input
                  id="tokenName"
                  placeholder="e.g. API Integration"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration (days)</Label>
                <Input
                  id="expiration"
                  type="number"
                  placeholder="Leave empty for no expiration"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Leave empty for a token that never expires.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateTokenOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateToken}>Create Token</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
