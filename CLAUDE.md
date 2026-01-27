# Technitium DNS UI - Project Guidelines

## Project Objective
A modern, lightweight web UI for Technitium DNS Server that can be deployed separately from the server. Built with performance, security, and polish as primary goals.

## Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (ALWAYS prefer shadcn components when available)
- **Routing**: React Router v7
- **Charts**: shadcn/ui charts (built on Recharts)
- **Notifications**: Sonner (via shadcn)

## Architecture Decisions

### API Integration
- Technitium DNS Server API documentation is in `APIDOCS.md`
- API responses have inconsistent structure:
  - Login returns data at root level: `{ status, token, username, ... }`
  - Most other endpoints wrap data in `response`: `{ status, response: { ... } }`
  - Stats are nested: `{ response: { stats: {...}, mainChartData: {...} } }`
- Token is stored in `sessionStorage` for security (not localStorage)
- All API calls go through `src/api/client.ts` which handles token injection

### Component Guidelines
1. **Always use shadcn/ui components** - check if shadcn has a component before creating custom ones
2. **Add shadcn components via CLI**: `npx shadcn@latest add <component>`
3. **Keep components lightweight** - avoid over-abstraction
4. **Use TypeScript strictly** - define interfaces for all API responses

### File Structure
```
src/
├── api/           # API client and endpoint functions
├── components/    # Reusable components
│   └── ui/        # shadcn/ui components (auto-generated)
├── context/       # React contexts (auth, etc.)
├── hooks/         # Custom hooks
├── pages/         # Route pages
└── types/         # TypeScript interfaces
```

### Security Practices
- Tokens in sessionStorage (cleared on tab close)
- Auto-logout on invalid token
- No credentials stored in localStorage
- Request timeouts (30s default)
- Proxy in dev to avoid CORS issues

### Styling Conventions
- Use Tailwind utilities directly
- Follow shadcn/ui patterns for consistency
- Dark mode support via CSS variables (already configured)
- Responsive design with Tailwind breakpoints

## API Endpoints Reference
Key endpoints used:
- `POST /api/user/login` - Authentication
- `GET /api/user/session/get` - Session validation
- `GET /api/dashboard/stats/get` - Dashboard statistics with charts
- `GET /api/zones/list` - List DNS zones
- `GET /api/settings/get` - Server configuration

## Development Commands
```bash
npm run dev      # Start dev server with proxy
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint check
```

## Environment Variables
- `VITE_API_URL` - API base URL (default: `/api` for proxy)

## Deployment Notes
- Production build outputs to `dist/`
- Configure reverse proxy to forward `/api` to Technitium server
- Or set `VITE_API_URL` to full Technitium URL and handle CORS server-side
