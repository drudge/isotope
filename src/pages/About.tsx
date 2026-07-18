import { useState } from "react";
import { Link } from "react-router";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useApi } from "@/hooks/useApi";
import { getServerInfo } from "@/api/dns";
import { apiClient } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUpCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  LineChart,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";

// Prometheus scrape config pointed at this deployment's /api proxy. The
// token placeholder is an API token created on the Profile page.
function prometheusScrapeConfig(): string {
  const { protocol, host } = window.location;
  return [
    "scrape_configs:",
    '  - job_name: "technitium-dns"',
    '    metrics_path: "/api/dashboard/metrics/text"',
    `    scheme: "${protocol.replace(":", "")}"`,
    "    params:",
    '      token: ["YOUR_API_TOKEN"]',
    "    static_configs:",
    `      - targets: ["${host}"]`,
  ].join("\n");
}

export default function About() {
  useDocumentTitle("About");
  const { data: serverInfo } = useApi(() => getServerInfo(), []);
  const { update, isUpdateAvailable, error, isLoading, refresh } =
    useUpdateCheck();
  const [isChecking, setIsChecking] = useState(false);
  const checking = isChecking || isLoading;

  // The server answers checkForUpdate from cache in tens of milliseconds, so
  // hold the checking state long enough for the spinner to be perceptible.
  const handleCheckNow = async () => {
    setIsChecking(true);
    try {
      await Promise.all([
        refresh(),
        new Promise((resolve) => setTimeout(resolve, 750)),
      ]);
    } finally {
      setIsChecking(false);
    }
  };

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
                <circle cx="456" cy="256" r="40" />
              </g>
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

          <div className="border-t pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Installed version</span>
                <span className="font-medium">
                  {serverInfo?.version ? `v${serverInfo.version}` : "—"}
                </span>
                {isUpdateAvailable && update ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
                    title={update.updateTitle || undefined}
                  >
                    <ArrowUpCircle className="h-3 w-3" />
                    v{update.updateVersion} available
                  </span>
                ) : checking ? null : error ? (
                  <span className="text-xs text-destructive" title={error}>
                    Update check failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Up to date
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckNow}
                disabled={checking}
              >
                <RefreshCw className={checking ? "animate-spin" : ""} />
                {checking ? "Checking…" : "Check now"}
              </Button>
            </div>

            {isUpdateAvailable && update && (
              <div className="space-y-3">
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
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Prometheus Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The server exposes lifetime query metrics in Prometheus text
            format. Authenticate the scrape with an API token — create one on
            the{" "}
            <Link to="/profile" className="text-primary hover:underline">
              Profile page
            </Link>
            , then drop this into your prometheus.yml:
          </p>
          <div className="relative">
            <pre className="font-mono text-xs overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 pr-10">
              {prometheusScrapeConfig()}
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7"
              onClick={() => {
                navigator.clipboard.writeText(prometheusScrapeConfig());
                toast.success("Copied to clipboard");
              }}
              title="Copy to clipboard"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <MetricsPreview />
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

// Fetches the live metrics endpoint with the current session and shows the
// first lines, proving the endpoint works before it goes into Prometheus.
function MetricsPreview() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { blob } = await apiClient.download("/dashboard/metrics/text");
      const text = await blob.text();
      setPreview(text.trim().split("\n").slice(0, 12).join("\n"));
    } catch (err) {
      setPreview(
        err instanceof Error ? `Failed to load metrics: ${err.message}` : "Failed to load metrics",
      );
    } finally {
      setLoading(false);
    }
  };

  return preview === null ? (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void loadPreview()}
      disabled={loading}
    >
      {loading ? "Loading..." : "Preview metrics"}
    </Button>
  ) : (
    <pre className="font-mono text-xs overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 max-h-56 overflow-y-auto">
      {preview}
    </pre>
  );
}
