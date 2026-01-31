export type ApiResponse<T = unknown> = {
  status: 'ok' | 'error' | 'invalid-token';
  errorMessage?: string;
  response?: T;
} & Partial<T>;

export interface User {
  displayName: string;
  username: string;
  disabled: boolean;
  previousSessionLoggedOn?: string;
  previousSessionRemoteAddress?: string;
  recentSessionLoggedOn?: string;
  recentSessionRemoteAddress?: string;
}

export interface DnsServerInfo {
  version: string;
  dnsServerDomain: string;
  serverDateTimeUtc: string;
  uptime: string;
  webServiceHttpPort: number;
  webServiceTlsPort?: number;
  webServiceUseSelfSignedTlsCertificate?: boolean;
}

export interface DnsStats {
  totalQueries: number;
  totalNoError: number;
  totalServerFailure: number;
  totalNxDomain: number;
  totalRefused: number;
  totalAuthoritative: number;
  totalRecursive: number;
  totalCached: number;
  totalBlocked: number;
  totalDropped: number;
  totalClients: number;
  zones: number;
  cachedEntries: number;
  allowedZones: number;
  blockedZones: number;
  blockListZones: number;
}

export interface DnsStatsResponse {
  stats: DnsStats;
  mainChartData?: unknown;
  queryResponseChartData?: unknown;
  queryTypeChartData?: unknown;
  protocolTypeChartData?: unknown;
}

export interface Zone {
  name: string;
  type: 'Primary' | 'Secondary' | 'Stub' | 'Forwarder' | 'SecondaryForwarder' | 'Catalog' | 'SecondaryCatalog';
  internal: boolean;
  dnssecStatus: 'Unsigned' | 'SignedWithNSEC' | 'SignedWithNSEC3';
  soaSerial?: number;
  expiry?: string;
  isExpired?: boolean;
  syncFailed?: boolean;
  notifyFailed?: boolean;
  notifyFailedFor?: string[];
  disabled: boolean;
}

export interface DnsRecord {
  name: string;
  type: string;
  ttl: number;
  rData: Record<string, unknown>;
  dnssecStatus?: string;
  disabled: boolean;
  lastUsedOn?: string;
  comments?: string;
  expiryTtl?: number;
}

export interface LoginResponse {
  displayName: string;
  username: string;
  token: string;
  tokenExpiry: string;
}

export interface ZoneListResponse {
  zones: Zone[];
}

export interface RecordListResponse {
  records: DnsRecord[];
}

export type BlockingType = 'AnyAddress' | 'NxDomain' | 'CustomAddress';

export interface BlockingSettings {
  enableBlocking: boolean;
  allowTxtBlockingReport: boolean;
  blockingBypassList: string[];
  blockingType: BlockingType;
  blockingAnswerTtl: number;
  customBlockingAddresses: string[];
  blockListUrls: string[];
  blockListUpdateIntervalHours: number;
  blockListNextUpdatedOn: string;
  temporaryDisableBlockingTill?: string;
}

export interface TemporaryDisableResponse {
  temporaryDisableBlockingTill: string;
}
