import { Badge } from '@/components/ui/badge';
import type { DnsApp, InstalledApp } from '@/api/dns';

const CAPABILITIES = {
  isAppRecordRequestHandler: {
    label: 'Record Handler',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  },
  isRequestController: {
    label: 'Controller',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
  },
  isAuthoritativeRequestHandler: {
    label: 'Authoritative',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800',
  },
  isRequestBlockingHandler: {
    label: 'Blocker',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800',
  },
  isQueryLogger: {
    label: 'Logger',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-800',
  },
  isPostProcessor: {
    label: 'Post Processor',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  },
} as const;

type CapabilityKey = keyof typeof CAPABILITIES;

function getAppCapabilities(app: InstalledApp): CapabilityKey[] {
  const caps = new Set<CapabilityKey>();
  for (const dnsApp of app.dnsApps || []) {
    for (const key of Object.keys(CAPABILITIES) as CapabilityKey[]) {
      if (dnsApp[key as keyof DnsApp]) {
        caps.add(key);
      }
    }
  }
  return Array.from(caps);
}

interface CapabilityBadgesProps {
  app: InstalledApp;
}

export function CapabilityBadges({ app }: CapabilityBadgesProps) {
  const caps = getAppCapabilities(app);
  if (caps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {caps.map((key) => (
        <Badge
          key={key}
          variant="outline"
          className={`text-[10px] font-medium px-1.5 py-0 ${CAPABILITIES[key].className}`}
        >
          {CAPABILITIES[key].label}
        </Badge>
      ))}
    </div>
  );
}
