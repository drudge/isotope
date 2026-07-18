import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  User,
  KeyRound,
  Clock,
  MapPin,
  ShieldCheck,
  TerminalSquare,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableText } from '@/components/ui/copyable-text';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import {
  changePassword,
  createApiToken,
  deleteUserSession,
  disable2fa,
  enable2fa,
  getUserProfile,
  init2fa,
} from '@/api/auth';
import type { TwoFactorInit, UserSessionEntry } from '@/types/api';
import { toast } from 'sonner';

export default function Profile() {
  useDocumentTitle('Profile');
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTotp, setPasswordTotp] = useState('');
  // Shown when the profile says 2FA is on, or the server demands a code.
  const [passwordNeedsTotp, setPasswordNeedsTotp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: profile, refetch: refetchProfile } = useApi(
    () => getUserProfile(),
    [],
  );

  // 2FA setup flow state
  const [totpSetup, setTotpSetup] = useState<TwoFactorInit | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [showDisable2fa, setShowDisable2fa] = useState(false);

  // API token state
  const [tokenName, setTokenName] = useState('');
  const [creatingToken, setCreatingToken] = useState(false);
  const [createdToken, setCreatedToken] = useState<{
    tokenName: string;
    token: string;
  } | null>(null);
  const [tokenToRevoke, setTokenToRevoke] = useState<UserSessionEntry | null>(
    null,
  );

  const apiTokens = (profile?.sessions ?? []).filter(
    (session) => session.type === 'ApiToken',
  );

  const handleStart2faSetup = async () => {
    setTotpBusy(true);
    const response = await init2fa();
    if (response.status === 'ok' && response.response) {
      if (response.response.totpEnabled) {
        // Already enabled elsewhere; just resync.
        refetchProfile();
      } else {
        setTotpSetup(response.response);
        setTotpCode('');
      }
    } else {
      toast.error(response.errorMessage || 'Failed to initialize 2FA');
    }
    setTotpBusy(false);
  };

  const handleEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setTotpBusy(true);
    const response = await enable2fa(totpCode);
    if (response.status === 'ok') {
      toast.success('Two-factor authentication enabled');
      setTotpSetup(null);
      setTotpCode('');
      refetchProfile();
    } else {
      toast.error(response.errorMessage || 'Invalid code — try again');
    }
    setTotpBusy(false);
  };

  const handleDisable2fa = async () => {
    const response = await disable2fa();
    if (response.status === 'ok') {
      toast.success('Two-factor authentication disabled');
      refetchProfile();
    } else {
      toast.error(response.errorMessage || 'Failed to disable 2FA');
    }
    setShowDisable2fa(false);
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;
    setCreatingToken(true);
    const response = await createApiToken(tokenName.trim());
    if (response.status === 'ok' && response.token) {
      setCreatedToken({
        tokenName: response.tokenName || tokenName.trim(),
        token: response.token,
      });
      setTokenName('');
      refetchProfile();
    } else {
      toast.error(response.errorMessage || 'Failed to create token');
    }
    setCreatingToken(false);
  };

  const handleRevokeToken = async () => {
    if (!tokenToRevoke) return;
    const response = await deleteUserSession(tokenToRevoke.partialToken);
    if (response.status === 'ok') {
      toast.success(`Token "${tokenToRevoke.tokenName}" revoked`);
      if (createdToken?.tokenName === tokenToRevoke.tokenName) {
        setCreatedToken(null);
      }
      refetchProfile();
    } else {
      toast.error(response.errorMessage || 'Failed to revoke token');
    }
    setTokenToRevoke(null);
  };

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
    const response = await changePassword(
      currentPassword,
      newPassword,
      passwordTotp || undefined,
    );

    if (response.status === 'ok') {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTotp('');
      setPasswordNeedsTotp(false);
    } else if (response.status === '2fa-required') {
      // Server wants a TOTP code even if the profile hasn't loaded yet.
      setPasswordNeedsTotp(true);
      toast.error(
        passwordTotp
          ? response.errorMessage || 'Invalid authenticator code'
          : 'Enter your authenticator code to change the password',
      );
    } else {
      toast.error(response.errorMessage || 'Failed to change password');
    }
    setIsChangingPassword(false);
  };

  const showPasswordTotp = passwordNeedsTotp || Boolean(profile?.totpEnabled);

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
                {showPasswordTotp && (
                  <div className="space-y-2">
                    <Label htmlFor="passwordTotp">Authenticator Code</Label>
                    <Input
                      id="passwordTotp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={passwordTotp}
                      onChange={(e) =>
                        setPasswordTotp(e.target.value.replace(/\D/g, ''))
                      }
                      autoComplete="one-time-code"
                      required
                      className="font-mono tracking-widest max-w-[160px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Two-factor authentication is enabled, so changing the
                      password also requires a code.
                    </p>
                  </div>
                )}
                <Button type="submit" disabled={isChangingPassword}>
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Two-Factor Authentication
                {profile &&
                  (profile.totpEnabled ? (
                    <Badge className="ml-1 border-transparent bg-green-500/15 text-green-600 dark:text-green-400">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-1 text-muted-foreground">
                      Off
                    </Badge>
                  ))}
              </CardTitle>
              <CardDescription>
                Require a time-based one-time code from an authenticator app
                when signing in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!profile ? (
                <Skeleton className="h-9 w-40" />
              ) : profile.totpEnabled ? (
                <Button
                  variant="outline"
                  onClick={() => setShowDisable2fa(true)}
                >
                  Disable 2FA
                </Button>
              ) : totpSetup ? (
                <form onSubmit={handleEnable2fa} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {totpSetup.qrCodePngImage && (
                      <img
                        src={`data:image/png;base64,${totpSetup.qrCodePngImage}`}
                        alt="TOTP QR code"
                        className="h-40 w-40 rounded-md border bg-white p-2 shrink-0"
                      />
                    )}
                    <div className="space-y-3 min-w-0">
                      <p className="text-sm text-muted-foreground">
                        Scan the QR code with your authenticator app, or enter
                        the secret manually:
                      </p>
                      {totpSetup.secret && (
                        <CopyableText
                          text={totpSetup.secret}
                          className="font-mono text-sm rounded-md border bg-muted/40 px-3 py-2"
                        />
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="totp-code">
                          Enter the 6-digit code to confirm
                        </Label>
                        <Input
                          id="totp-code"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={totpCode}
                          onChange={(e) =>
                            setTotpCode(e.target.value.replace(/\D/g, ''))
                          }
                          className="font-mono tracking-widest max-w-[160px]"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={totpBusy || totpCode.length !== 6}
                    >
                      {totpBusy ? 'Verifying...' : 'Enable 2FA'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setTotpSetup(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button onClick={() => void handleStart2faSetup()} disabled={totpBusy}>
                  {totpBusy ? 'Preparing...' : 'Set Up 2FA'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* API Tokens Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TerminalSquare className="h-5 w-5" />
                API Tokens
              </CardTitle>
              <CardDescription>
                Non-expiring tokens for scripts, Terraform, or Prometheus.
                Tokens carry the same permissions as your account and cannot
                change your password or profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={handleCreateToken}
                className="flex flex-col sm:flex-row gap-2"
              >
                <Input
                  placeholder="Token name (e.g. prometheus)"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="sm:max-w-xs"
                />
                <Button
                  type="submit"
                  disabled={creatingToken || !tokenName.trim()}
                >
                  {creatingToken ? 'Creating...' : 'Create Token'}
                </Button>
              </form>

              {createdToken && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Token "{createdToken.tokenName}" created — copy it now.
                    It will not be shown again.
                  </p>
                  <CopyableText
                    text={createdToken.token}
                    className="font-mono text-xs break-all rounded-md border bg-background px-3 py-2"
                  />
                </div>
              )}

              {apiTokens.length > 0 ? (
                <div className="rounded-lg border divide-y">
                  {apiTokens.map((session) => (
                    <div
                      key={session.partialToken}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {session.tokenName || 'Unnamed token'}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {session.partialToken}… · last used{' '}
                          {new Date(session.lastSeen).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => setTokenToRevoke(session)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Revoke token</span>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                profile && (
                  <p className="text-sm text-muted-foreground">
                    No API tokens yet.
                  </p>
                )
              )}
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

      {/* Disable 2FA Confirmation */}
      <AlertDialog open={showDisable2fa} onOpenChange={setShowDisable2fa}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will no longer require an authenticator code at
              sign-in. You can re-enable it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2fa}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Token Confirmation */}
      <AlertDialog
        open={!!tokenToRevoke}
        onOpenChange={(open) => {
          if (!open) setTokenToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Revoke token "{tokenToRevoke?.tokenName}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this token will immediately lose access. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeToken}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
