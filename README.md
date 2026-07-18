# Isotope

A clean, fast web interface for [Technitium DNS Server](https://technitium.com/dns/).

![Isotope Screenshot](https://raw.githubusercontent.com/drudge/isotope/main/.github/screenshot.png)

## Features

- Modern, responsive UI that works on desktop and mobile
- Real-time dashboard with query statistics, charts, live auto-refresh, and custom date ranges
- Zone management with full DNS record editing, per-zone options (query access, zone transfer, notify, dynamic updates), and per-zone permissions
- Zone file import/export, clone, convert, and resync
- Cache browser with domain-level controls
- Block list and allow list management
- DHCP scope and lease management, including MAC address reservations
- DNS Client for query testing
- DNS Apps management
- Query log viewer with advanced filtering, live tail, one-click block/allow, and CSV export
- Server log viewer with syntax highlighting
- Administration panel (users, groups, sessions, permissions)
- Comprehensive server settings with one-click backup and restore
- Cluster management
- Command palette (⌘K) for quick navigation and actions
- Dark mode support

## Installation

### Docker (Recommended)

```bash
docker run -d \
  -p 8080:80 \
  -e TECHNITIUM_API_URL=http://your-technitium-server:5380 \
  --name isotope \
  ghcr.io/drudge/isotope:latest
```

Then open http://localhost:8080 in your browser.

### Docker Compose

```yaml
services:
  isotope:
    image: ghcr.io/drudge/isotope:latest
    ports:
      - "8080:80"
    environment:
      - TECHNITIUM_API_URL=http://technitium:5380
    depends_on:
      - technitium

  technitium:
    image: technitium/dns-server:latest
    ports:
      - "5380:5380"
      - "53:53/udp"
      - "53:53/tcp"
    volumes:
      - technitium-data:/etc/dns

volumes:
  technitium-data:
```

### Static Files

Download the latest release from the [releases page](https://github.com/drudge/isotope/releases) and serve the files with any web server. Configure your server to:

1. Serve the static files
2. Proxy `/api/*` requests to your Technitium DNS Server
3. Return `index.html` for all non-file routes (SPA fallback)

Example nginx configuration:

```nginx
server {
    listen 80;
    root /var/www/isotope;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:5380/api/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (proxies API to localhost:5380)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env.local` file to configure the development server:

```env
VITE_API_URL=http://localhost:5380
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TECHNITIUM_API_URL` | URL of your Technitium DNS Server | `http://localhost:5380` |
| `CLUSTER_NODE_ALLOWED_DOMAINS` | Comma-separated allow-list enabling the cluster **Add Node** flow. See below. | *(unset — feature off)* |
| `CLUSTER_NODE_RESOLVER` | DNS resolver nginx uses to reach enrolled nodes. | `127.0.0.11` (Docker DNS) |

### Adding nodes to a cluster

Technitium requires a cluster join to be initiated **on the joining node**, and its
web service sends no CORS headers — so the browser cannot call another node
directly. Isotope's **Add Node** button (on the primary's Cluster page) works by
proxying to the new node through a same-origin path, `/cluster-node/<scheme>/<host>/…`.

That proxy is **off by default** and only forwards to hosts you allow-list, so it
can never become an open forwarder:

```bash
docker run -d \
  -p 8080:80 \
  -e TECHNITIUM_API_URL=http://ns1.example.com:5380 \
  -e CLUSTER_NODE_ALLOWED_DOMAINS=dns.example.com \
  ghcr.io/drudge/isotope:latest
```

A target host is accepted only if it equals, or is a subdomain of, a listed
domain. Adding `ns3`, `ns4`, … later needs no further config as long as they share
an allow-listed domain. If nodes resolve via a non-Docker DNS server, set
`CLUSTER_NODE_RESOLVER` to one that can resolve them. If Isotope is exposed to
untrusted networks, require auth in front of the `/cluster-node/` path.

For a custom reverse proxy instead of the bundled image, forward
`/cluster-node/<scheme>/<host>/…` to `<scheme>://<host>/…` with the same
allow-list and (for self-signed nodes) upstream TLS verification disabled.

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- React Router v7
- Vite

## Why "Isotope"?

Technitium is element 43 on the periodic table. In nature, it has no stable isotopes. Now it has one.

## License

MIT
