# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-02-14

### Improved

- **DNS Client** - Redesigned with modern two-column layout, color-coded status indicators, gradient stat boxes, and copyable results (#26)
- **DNS Apps** - Rebuilt with component-based architecture, tabbed navigation (Installed / App Store), search, capability badges, and dual-mode config editing with syntax-highlighted JSON editor (#25)
- **Server Logs** - Added log file switcher dropdown for quickly switching between log files, plus rendering performance optimizations (#29)
- **Settings** - Removed sidebar for full-width layout, added persistent text labels to all tab icons (#23, #24)
- **Theme Switcher** - Moved to profile menu with accessible radio group selection, real-time system theme reactivity (#28, #30)
- **Sidebar** - State now persists across page reloads (#27)

## [1.0.0] - 2025-02-02

### Initial Release

A clean, fast web interface for Technitium DNS Server.

#### Features

- **Dashboard** - Real-time statistics with query charts and server metrics
- **Zone Management** - Full DNS record editing with support for all record types
- **Cache Browser** - Browse and manage cached DNS records with domain-level controls
- **Block/Allow Lists** - Manage block lists and allow lists for DNS filtering
- **DHCP Management** - Configure DHCP scopes and manage leases
- **DNS Client** - Built-in DNS query testing tool
- **DNS Apps** - Manage DNS applications and plugins
- **Query Logs** - Advanced log viewer with filtering capabilities
- **Server Logs** - Server log viewer with syntax highlighting
- **Administration** - User, group, session, and permission management
- **Server Settings** - Comprehensive configuration across all server options
- **Cluster Management** - Manage DNS server clusters
- **Dark Mode** - Full dark mode support
- **Responsive Design** - Works on desktop and mobile devices

#### Deployment Options

- Docker image with multi-platform support (amd64, arm64)
- Static file deployment with any web server
