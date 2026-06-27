import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useApi } from "@/hooks/useApi";
import { getServerInfo } from "@/api/dns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";

export default function About() {
  useDocumentTitle("About");
  const { data: serverInfo } = useApi(() => getServerInfo(), []);
  const { update, isUpdateAvailable, error, isLoading, refresh } =
    useUpdateCheck();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center py-8">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-primary/10 rounded-lg flex items-center justify-center">
            <svg
              viewBox="0 0 512 512"
              className="w-14 h-14 text-primary"
              fill="currentColor"
            >
              <circle
                cx="256"
                cy="256"
                r="200"
                fill="none"
                stroke="currentColor"
                strokeWidth="32"
                opacity="0.3"
              />
              <circle cx="256" cy="256" r="80" />
              <circle cx="456" cy="256" r="40" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-2">Isotope</h1>
        <p className="text-muted-foreground">
          A clean, fast interface for Technitium DNS Server
        </p>
        {serverInfo && (
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            {serverInfo.version && (
              <span>Technitium v{serverInfo.version}</span>
            )}
            {serverInfo.dnsServerDomain && (
              <>
                <span className="text-border">|</span>
                <span>{serverInfo.dnsServerDomain}</span>
              </>
            )}
            {serverInfo.uptime && (
              <>
                <span className="text-border">|</span>
                <span>Uptime: {serverInfo.uptime}</span>
              </>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Isotope is an alternative web interface for Technitium DNS Server,
            built for speed and simplicity. Deploy it alongside your server for
            a streamlined management experience.
          </p>
          <p className="text-sm text-muted-foreground">
            Named for element 43 on the periodic table—Technitium has no stable
            isotopes in nature. Until now.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Technitium DNS Server</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            An open source authoritative and recursive DNS server with built-in
            support for DNS-over-HTTPS, DNS-over-TLS, DNSSEC, and ad blocking.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a
              href="https://technitium.com/dns/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1.5"
            >
              Website
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/TechnitiumSoftware/DnsServer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1.5"
            >
              GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://blog.technitium.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1.5"
            >
              Blog
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/TechnitiumSoftware/DnsServer/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1.5"
            >
              Community
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Server Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUpdateAvailable && update ? (
            <>
              <div className="flex items-start gap-3">
                <ArrowUpCircle className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {update.updateTitle || "A new version is available"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Technitium DNS Server v{update.currentVersion} &rarr; v
                    {update.updateVersion}
                  </p>
                </div>
              </div>
              {update.updateMessage && (
                <p className="text-sm text-muted-foreground">
                  {update.updateMessage}
                </p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {update.downloadLink && (
                  <a
                    href={update.downloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1.5"
                  >
                    Download
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {update.changeLogLink && (
                  <a
                    href={update.changeLogLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1.5"
                  >
                    Change log
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {update.instructionsLink && (
                  <a
                    href={update.instructionsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1.5"
                  >
                    Update instructions
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Checking for updates…"
                  : error
                    ? "Couldn't check for updates right now."
                    : update?.currentVersion
                      ? `You're running the latest version (v${update.currentVersion}).`
                      : "You're up to date."}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} />
            Check now
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Isotope is free and open source. If you find it useful, consider
            supporting the Technitium project.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a
              href="https://github.com/drudge/isotope"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1.5"
            >
              Isotope on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://technitium.com/donate/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1.5"
            >
              Donate to Technitium
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground py-4">
        <p>
          <a
            href="https://github.com/drudge/isotope/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            MIT License
          </a>
        </p>
      </div>
    </div>
  );
}
