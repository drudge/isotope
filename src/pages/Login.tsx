import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ShieldCheck } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/context/AuthContext";
import { getSsoStatus } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Login() {
  useDocumentTitle("Login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  // The SSO flow lands back on "/" with an error in the URL hash when the
  // provider rejects the sign-in; surface it instead of dropping it.
  const [error, setError] = useState(() => {
    const hash = window.location.hash;
    return hash.startsWith("#error=")
      ? decodeURIComponent(hash.slice("#error=".length))
      : "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  useEffect(() => {
    if (window.location.hash.startsWith("#error=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    let cancelled = false;
    getSsoStatus()
      .then((response) => {
        if (!cancelled && response.ssoEnabled) setSsoEnabled(true);
      })
      .catch(() => {
        // SSO status is best-effort; older servers may not support it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(username, password, totp || undefined);

    if (result.success) {
      navigate(from, { replace: true });
    } else if (result.requires2fa) {
      setNeedsTotp(true);
      if (result.error) setError(result.error);
    } else {
      setError(result.error || "Login failed");
      // A failed password attempt restarts the flow.
      setNeedsTotp(false);
      setTotp("");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <svg
              viewBox="0 0 512 512"
              className="size-16 text-foreground"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle
                cx="256"
                cy="256"
                r="200"
                fill="none"
                stroke="currentColor"
                strokeWidth="24"
                opacity="0.15"
              />
              <circle
                cx="256"
                cy="256"
                r="80"
                className="animate-nucleus-pulse"
                style={{ transformOrigin: "256px 256px" }}
              />
              <g
                className="animate-orbit"
                style={{ transformOrigin: "256px 256px" }}
              >
                <circle cx="456" cy="256" r="28" />
              </g>
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Isotope</CardTitle>
          <CardDescription>
            Sign in to your Technitium DNS server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
            </div>
            {needsTotp && (
              <div className="space-y-2">
                <Label htmlFor="totp">Authenticator Code</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  maxLength={6}
                  value={totp}
                  onChange={(e) =>
                    setTotp(e.target.value.replace(/\D/g, ""))
                  }
                  required
                  disabled={isSubmitting}
                  autoFocus
                  className="font-mono tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Two-factor authentication is enabled for this account.
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          {ssoEnabled && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
                onClick={() => {
                  window.location.href = "/sso/login";
                }}
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Sign in with SSO
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
