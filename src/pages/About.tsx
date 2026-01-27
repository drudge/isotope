import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

export default function About() {
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
