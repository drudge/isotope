import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import http from 'node:http'
import https from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Parse a comma-separated allow-list of node domains (suffix match). A target
// host is allowed if it equals a listed domain or is a subdomain of one.
function parseAllowedDomains(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
}

function hostIsAllowed(host: string, allowed: string[]): boolean {
  const h = host.toLowerCase().split(':')[0]
  return allowed.some((d) => h === d || h.endsWith('.' + d))
}

// Dev/preview proxy for driving a DNS node that is NOT yet part of the cluster
// (e.g. enrolling ns2 as a secondary from the primary's UI). The browser calls
// a same-origin path so there is no CORS involved (Technitium sends no CORS
// headers); this middleware forwards it to the node's own web service.
//
//   /cluster-node/<scheme>/<host>/<path>  ->  <scheme>://<host>/<path>
//
// The target host must match CLUSTER_NODE_ALLOWED_DOMAINS or the request is
// refused (fail-closed) so this can never become an open forward proxy. In
// production the nginx image enforces the same allow-list from the same env
// var; see nginx.conf.template / docker-entrypoint.sh.
function clusterNodeProxyPlugin(allowedDomains: string[]): Plugin {
  const handle = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (!req.url || !req.url.startsWith('/cluster-node/')) return next()

    const fail = (status: number, message: string) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'error', errorMessage: message }))
    }

    const match = req.url.match(/^\/cluster-node\/(https?)\/([^/]+)(\/.*)?$/)
    if (!match) return fail(400, 'Malformed cluster-node proxy path')

    const scheme = match[1]
    const host = decodeURIComponent(match[2])
    const forwardPath = match[3] || '/'

    if (allowedDomains.length === 0) {
      return fail(403, 'Cluster-node proxy is disabled: set CLUSTER_NODE_ALLOWED_DOMAINS')
    }
    if (!hostIsAllowed(host, allowedDomains)) {
      return fail(403, `Host "${host}" is not in CLUSTER_NODE_ALLOWED_DOMAINS`)
    }

    const [hostname, port] = host.split(':')
    const agent = scheme === 'https' ? https : http
    const upstream = agent.request(
      {
        hostname,
        port: port ? Number(port) : scheme === 'https' ? 443 : 80,
        method: req.method,
        path: forwardPath,
        headers: { ...req.headers, host },
        // Secondary nodes usually present a self-signed cert before joining.
        rejectUnauthorized: false,
      },
      (up) => {
        res.statusCode = up.statusCode || 502
        for (const [key, value] of Object.entries(up.headers)) {
          if (value !== undefined) res.setHeader(key, value)
        }
        up.pipe(res)
      },
    )
    upstream.on('error', (err) =>
      fail(502, `Could not reach ${scheme}://${host}: ${err.message}`),
    )
    req.pipe(upstream)
  }

  return {
    name: 'cluster-node-proxy',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const allowedDomains = parseAllowedDomains(env.CLUSTER_NODE_ALLOWED_DOMAINS)

  return {
    plugins: [react(), tailwindcss(), clusterNodeProxyPlugin(allowedDomains)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              if (id.includes('recharts') || id.includes('d3-') || id.includes('react-smooth') || id.includes('victory-vendor')) {
                return 'vendor-charts';
              }
            }
          },
        },
      },
    },
    server: {
      // Honor the port assigned by the Claude Code preview harness (autoPort).
      port: process.env.PORT ? Number(process.env.PORT) : undefined,
      proxy: {
        '/api': {
          target: 'https://ns1.dns.penree.net',
          changeOrigin: true,
          secure: true,
        },
        // OIDC single sign-on: /sso/login starts the flow and /sso/callback
        // finishes it, setting a token cookie and redirecting back to "/".
        '/sso': {
          target: 'https://ns1.dns.penree.net',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
