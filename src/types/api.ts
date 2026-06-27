export type ApiResponse<T = unknown> = {
  // '2fa-required' added in Technitium v14 (TOTP 2FA): returned by login,
  // changePassword and createToken when an OTP is required but not provided.
  status: 'ok' | 'error' | 'invalid-token' | '2fa-required';
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

// Partial view of the /settings/get response. The full v15.2 settings surface
// has 100+ fields (recursion, forwarders, blocking, TLS/DoH/DoT/DoQ, rate
// limiting, clustering, IPv6 mode, ECS, Prometheus, reverse-proxy ACLs, etc.).
// Extend this interface when building a writable Settings editor.
export interface DnsServerInfo {
  version: string;
  dnsServerDomain: string;
  serverDateTimeUtc: string;
  uptime: string;
  webServiceHttpPort: number;
  webServiceTlsPort?: number;
  webServiceUseSelfSignedTlsCertificate?: boolean;
  // Default TTLs (defaultNsRecordTtl/defaultSoaRecordTtl added in v14.3).
  defaultRecordTtl?: number;
  defaultNsRecordTtl?: number;
  defaultSoaRecordTtl?: number;
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

export interface SectionPermission {
  canView: boolean;
  canModify: boolean;
  canDelete: boolean;
}

// Subset of /settings/get returned inside the login response when
// includeInfo=true (the app already passes includeInfo).
export interface LoginInfo {
  version: string;
  dnsServerDomain: string;
  defaultRecordTtl?: number;
  defaultNsRecordTtl?: number;
  defaultSoaRecordTtl?: number;
  // Per-section access for the logged-in user, keyed by section name
  // (Dashboard, Zones, Cache, Settings, Administration, Logs, ...).
  permissions?: Record<string, SectionPermission>;
}

export interface LoginResponse {
  displayName: string;
  username: string;
  token: string;
  // Older servers returned tokenExpiry; may be absent on v15.x.
  tokenExpiry?: string;
  // v15: account is provisioned via SSO/OIDC.
  isSsoUser?: boolean;
  // v14+: whether TOTP 2FA is enabled for this account.
  totpEnabled?: boolean;
  // Present when login is called with includeInfo=true.
  info?: LoginInfo;
}

// Response from GET /api/user/checkForUpdate (payload wrapped in `response`).
// PERMISSIONS: None — any authenticated user may call it. Trust the
// updateAvailable boolean rather than comparing version strings client-side.
export interface UpdateCheckResult {
  updateAvailable: boolean;
  updateVersion: string;
  currentVersion: string;
  updateTitle?: string;
  updateMessage?: string;
  downloadLink?: string;
  instructionsLink?: string;
  changeLogLink?: string;
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
