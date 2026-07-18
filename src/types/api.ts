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

export interface TopClientEntry {
  name: string;
  // Reverse-lookup result; absent when the PTR resolution found nothing.
  domain?: string;
  hits: number;
  rateLimited?: boolean;
}

export interface TopDomainEntry {
  name: string;
  hits: number;
}

// Response of /dashboard/stats/getTop; only the field matching the requested
// statsType is present.
export interface TopStatsResponse {
  topClients?: TopClientEntry[];
  topDomains?: TopDomainEntry[];
  topBlockedDomains?: TopDomainEntry[];
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

// Response of GET /api/sso/status (root-level fields, unauthenticated).
export interface SsoStatus {
  ssoEnabled: boolean;
  server?: string;
}

// Response of /user/2fa/init. When 2FA is already enabled only totpEnabled
// is returned; otherwise the server includes a rendered QR code PNG and the
// base32 secret for manual authenticator entry.
export interface TwoFactorInit {
  totpEnabled: boolean;
  qrCodePngImage?: string;
  secret?: string;
}

// One entry of the sessions list in /user/profile/get (same shape as the
// admin sessions API).
export interface UserSessionEntry {
  username: string;
  isCurrentSession: boolean;
  partialToken: string;
  type: 'Standard' | 'ApiToken';
  tokenName: string | null;
  lastSeen: string;
  lastSeenRemoteAddress: string;
  lastSeenUserAgent: string;
}

// Response of /user/profile/get.
export interface UserProfile {
  displayName: string;
  username: string;
  isSsoUser?: boolean;
  totpEnabled: boolean;
  disabled: boolean;
  previousSessionLoggedOn?: string;
  previousSessionRemoteAddress?: string;
  recentSessionLoggedOn?: string;
  recentSessionRemoteAddress?: string;
  sessionTimeoutSeconds?: number;
  memberOfGroups?: string[];
  sessions?: UserSessionEntry[];
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
  // Present only when the request asked for paginated results.
  pageNumber?: number;
  totalPages?: number;
  totalZones?: number;
}

// Response of /zones/options/get. Which fields are present depends on the
// zone type (e.g. primaryNameServerAddresses only for Secondary/Stub kinds).
export interface ZoneOptions {
  name: string;
  type: Zone['type'];
  internal: boolean;
  dnssecStatus: string;
  disabled: boolean;
  notifyFailed?: boolean;
  notifyFailedFor?: string[];
  catalog?: string;
  overrideCatalogQueryAccess?: boolean;
  overrideCatalogZoneTransfer?: boolean;
  overrideCatalogNotify?: boolean;
  primaryNameServerAddresses?: string[];
  primaryZoneTransferProtocol?: 'Tcp' | 'Tls' | 'Quic';
  primaryZoneTransferTsigKeyName?: string;
  validateZone?: boolean;
  queryAccess?: string;
  queryAccessNetworkACL?: string[];
  zoneTransfer?: string;
  zoneTransferNetworkACL?: string[];
  zoneTransferTsigKeyNames?: string[];
  notify?: string;
  notifyNameServers?: string[];
  notifySecondaryCatalogsNameServers?: string[];
  update?: string;
  updateNetworkACL?: string[];
  updateSecurityPolicies?: UpdateSecurityPolicy[];
  availableCatalogZoneNames?: string[];
  availableTsigKeyNames?: string[];
}

export interface UpdateSecurityPolicy {
  tsigKeyName: string;
  domain: string;
  allowedTypes: string[];
}

export interface ZoneUserPermission {
  username: string;
  canView: boolean;
  canModify: boolean;
  canDelete: boolean;
}

export interface ZoneGroupPermission {
  name: string;
  canView: boolean;
  canModify: boolean;
  canDelete: boolean;
}

export interface ZonePermissions {
  section: string;
  subItem: string;
  userPermissions: ZoneUserPermission[];
  groupPermissions: ZoneGroupPermission[];
  // Present when includeUsersAndGroups=true.
  users?: string[];
  groups?: string[];
}

export interface RecordListResponse {
  records: DnsRecord[];
}

// DNSSEC (zones/dnssec/*). Wire formats verified against the server's
// WebServiceZonesApi.cs — several fields below are absent from APIDOCS.md
// (isRetiring on DS records, nsec3Iterations/nsec3SaltLength, stateActiveBy).

export interface DnssecDsDigest {
  digestType: string;
  // The server returns this as a string (e.g. "2" for SHA256, "4" for SHA384).
  digestTypeNumber: string;
  digest: string;
}

export interface DnssecDsRecord {
  keyTag: number;
  // Present only when a matching KSK private key exists for the DNSKEY.
  dnsKeyState?: string;
  // Present only while the KSK is in the Published state.
  dnsKeyStateReadyBy?: string;
  isRetiring?: boolean;
  algorithm: string;
  algorithmNumber: number;
  publicKey: string;
  digests: DnssecDsDigest[];
}

export interface DnssecDsInfo {
  name: string;
  type: Zone['type'];
  disabled: boolean;
  dnssecStatus: string;
  dsRecords: DnssecDsRecord[];
}

export type DnssecKeyType = 'KeySigningKey' | 'ZoneSigningKey';

export interface DnssecPrivateKey {
  keyTag: number;
  keyType: DnssecKeyType;
  // For RSA keys the server appends the key size, e.g. "RSASHA256 (2048 bits)".
  algorithm: string;
  algorithmNumber: number;
  // Generated | Published | Ready | Active | Retired | Revoked (render as-is).
  state: string;
  stateChangedOn: string;
  // Published KSKs carry stateReadyBy; published ZSKs carry stateActiveBy.
  stateReadyBy?: string;
  stateActiveBy?: string;
  isRetiring: boolean;
  rolloverDays: number;
}

export interface DnssecProperties {
  name: string;
  type: Zone['type'];
  disabled: boolean;
  dnssecStatus: 'Unsigned' | 'SignedWithNSEC' | 'SignedWithNSEC3';
  // Present only when signed with NSEC3.
  nsec3Iterations?: number;
  nsec3SaltLength?: number;
  dnsKeyTtl: number;
  dnssecPrivateKeys: DnssecPrivateKey[];
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
