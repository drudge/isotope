import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { User, KeyRound, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { changePassword } from '@/api/auth';
import { toast } from 'sonner';

export default function Profile() {
  useDocumentTitle('Profile');
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and password
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Info Card */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <User className="h-6 w-6 text-primary" />
                    Account Information
                  </CardTitle>
                  <CardDescription>
                    Your account details and session information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      Username
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-blue-900 dark:text-blue-50 font-mono">
                    {user?.username || '-'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-900 dark:text-purple-100">
                      Display Name
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-purple-900 dark:text-purple-50">
                    {user?.displayName || '-'}
                  </div>
                </div>
              </div>

              {/* Session Info */}
              {(user?.previousSessionLoggedOn || user?.recentSessionLoggedOn) && (
                <div className="pt-4 border-t space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Session History</h3>
                  {user?.recentSessionLoggedOn && (
                    <div className="flex items-start gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Current Session</p>
                        <p className="text-muted-foreground">
                          {new Date(user.recentSessionLoggedOn).toLocaleString()}
                          {user.recentSessionRemoteAddress && (
                            <span className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {user.recentSessionRemoteAddress}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {user?.previousSessionLoggedOn && (
                    <div className="flex items-start gap-3 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Previous Session</p>
                        <p className="text-muted-foreground">
                          {new Date(user.previousSessionLoggedOn).toLocaleString()}
                          {user.previousSessionRemoteAddress && (
                            <span className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {user.previousSessionRemoteAddress}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password. Use a strong password with at least 8 characters.
              </CardDescription>
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
        </div>

        {/* Right Column - Guidance (1/3 width) */}
        <div className="space-y-6">
          {/* Password Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Password Security Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Use a strong password</p>
                  <p className="text-sm text-muted-foreground">
                    At least 8 characters with a mix of letters, numbers, and symbols
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Don't reuse passwords</p>
                  <p className="text-sm text-muted-foreground">
                    Use a unique password for this account
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Use a password manager</p>
                  <p className="text-sm text-muted-foreground">
                    Store your passwords securely
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Note:</strong> After changing your password, you'll remain logged in on this device. Other active sessions may require re-authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
