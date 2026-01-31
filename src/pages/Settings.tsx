import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { getServerInfo, flushCache } from '@/api/dns';
import { changePassword } from '@/api/auth';
import { toast } from 'sonner';

export default function Settings() {
  useDocumentTitle("Settings");
  const { user } = useAuth();
  const { data: serverInfo, isLoading } = useApi(() => getServerInfo(), []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isFlushingCache, setIsFlushingCache] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    const response = await changePassword(currentPassword, newPassword);

    if (response.status === 'ok') {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(response.errorMessage || 'Failed to change password');
    }
    setIsChangingPassword(false);
  };

  const handleFlushCache = async () => {
    setIsFlushingCache(true);
    const response = await flushCache();

    if (response.status === 'ok') {
      toast.success('Cache flushed successfully');
    } else {
      toast.error(response.errorMessage || 'Failed to flush cache');
    }
    setIsFlushingCache(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and server settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <Label className="text-muted-foreground text-sm">Username</Label>
            <p className="font-mono">{user?.username}</p>
          </div>
          <div className="grid gap-1">
            <Label className="text-muted-foreground text-sm">Display Name</Label>
            <p>{user?.displayName}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Server Information</CardTitle>
          <CardDescription>Technitium DNS Server details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : serverInfo ? (
            <>
              <div className="grid gap-1">
                <Label className="text-muted-foreground text-sm">Version</Label>
                <p>{serverInfo.version}</p>
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground text-sm">Server Domain</Label>
                <p className="font-mono">{serverInfo.dnsServerDomain}</p>
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground text-sm">Uptime</Label>
                <p>{serverInfo.uptime}</p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>Manage DNS cache</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleFlushCache}
            disabled={isFlushingCache}
          >
            {isFlushingCache ? 'Flushing...' : 'Flush Cache'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
