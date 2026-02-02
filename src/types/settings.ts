// DNS Server Settings Types
// Based on Technitium DNS Server API

export type RecursionMode = 'Deny' | 'Allow' | 'AllowOnlyForPrivateNetworks' | 'UseSpecifiedNetworkACL';
export type ForwarderProtocol = 'Udp' | 'Tcp' | 'Tls' | 'Https' | 'Quic';
export type ProxyType = 'None' | 'Http' | 'Socks5';
export type LoggingType = 'None' | 'File' | 'Console' | 'FileAndConsole';
export type BlockingType = 'AnyAddress' | 'NxDomain' | 'CustomAddress';
export type TsigAlgorithm =
  | 'hmac-md5.sig-alg.reg.int'
  | 'hmac-sha1'
  | 'hmac-sha256'
  | 'hmac-sha256-128'
  | 'hmac-sha384'
  | 'hmac-sha384-192'
  | 'hmac-sha512'
  | 'hmac-sha512-256';

export interface TsigKey {
  keyName: string;
  sharedSecret: string;
  algorithmName: TsigAlgorithm;
}

export interface QpmPrefixLimit {
  prefix: number;
  udpLimit: number;
  tcpLimit: number;
}

export interface ProxySettings {
  type: ProxyType;
  address: string;
  port: number;
  username?: string;
  password?: string;
  bypass: string[];
}

// Full DNS Settings from /api/settings/get
export interface DnsSettings {
  // Server info (read-only)
  version: string;
  uptimestamp: string;

  // General settings
  dnsServerDomain: string;
  dnsServerLocalEndPoints: string[];
  dnsServerIPv4SourceAddresses: string[];
  dnsServerIPv6SourceAddresses: string[];
  defaultRecordTtl: number;
  defaultResponsiblePerson: string | null;
  useSoaSerialDateScheme: boolean;
  minSoaRefresh: number;
  minSoaRetry: number;
  zoneTransferAllowedNetworks: string[];
  notifyAllowedNetworks: string[];
  dnsAppsEnableAutomaticUpdate: boolean;
  preferIPv6: boolean;
  udpPayloadSize: number;

  // UDP Socket Pool
  enableUdpSocketPool: boolean;
  socketPoolExcludedPorts: number[];

  // DNSSEC & EDNS
  dnssecValidation: boolean;
  eDnsClientSubnet: boolean;
  eDnsClientSubnetIPv4PrefixLength: number;
  eDnsClientSubnetIPv6PrefixLength: number;
  eDnsClientSubnetIpv4Override: string | null;
  eDnsClientSubnetIpv6Override: string | null;

  // QPM Rate Limiting
  qpmPrefixLimitsIPv4: QpmPrefixLimit[];
  qpmPrefixLimitsIPv6: QpmPrefixLimit[];
  qpmLimitSampleMinutes: number;
  qpmLimitUdpTruncationPercentage: number;
  qpmLimitBypassList: string[];

  // Timeouts
  clientTimeout: number;
  tcpSendTimeout: number;
  tcpReceiveTimeout: number;
  quicIdleTimeout: number;
  quicMaxInboundStreams: number;
  listenBacklog: number;
  maxConcurrentResolutionsPerCore: number;

  // Web Service
  webServiceLocalAddresses: string[];
  webServiceHttpPort: number;
  webServiceEnableTls: boolean;
  webServiceEnableHttp3: boolean;
  webServiceHttpToTlsRedirect: boolean;
  webServiceUseSelfSignedTlsCertificate: boolean;
  webServiceTlsPort: number;
  webServiceTlsCertificatePath: string | null;
  webServiceTlsCertificatePassword: string;
  webServiceRealIpHeader: string;

  // Optional Protocols
  enableDnsOverUdpProxy: boolean;
  enableDnsOverTcpProxy: boolean;
  enableDnsOverHttp: boolean;
  enableDnsOverTls: boolean;
  enableDnsOverHttps: boolean;
  enableDnsOverHttp3: boolean;
  enableDnsOverQuic: boolean;
  dnsOverUdpProxyPort: number;
  dnsOverTcpProxyPort: number;
  dnsOverHttpPort: number;
  dnsOverTlsPort: number;
  dnsOverHttpsPort: number;
  dnsOverQuicPort: number;
  reverseProxyNetworkACL: string[];
  dnsTlsCertificatePath: string | null;
  dnsTlsCertificatePassword: string;
  dnsOverHttpRealIpHeader: string;

  // TSIG
  tsigKeys: TsigKey[];

  // Recursion
  recursion: RecursionMode;
  recursionNetworkACL: string[];
  randomizeName: boolean;
  qnameMinimization: boolean;
  resolverRetries: number;
  resolverTimeout: number;
  resolverConcurrency: number;
  resolverMaxStackCount: number;

  // Cache
  saveCache: boolean;
  serveStale: boolean;
  serveStaleTtl: number;
  serveStaleAnswerTtl: number;
  serveStaleResetTtl: number;
  serveStaleMaxWaitTime: number;
  cacheMaximumEntries: number;
  cacheMinimumRecordTtl: number;
  cacheMaximumRecordTtl: number;
  cacheNegativeRecordTtl: number;
  cacheFailureRecordTtl: number;
  cachePrefetchEligibility: number;
  cachePrefetchTrigger: number;
  cachePrefetchSampleIntervalInMinutes: number;
  cachePrefetchSampleEligibilityHitsPerHour: number;

  // Blocking
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

  // Proxy
  proxy: ProxySettings | null;
  proxyType?: ProxyType;
  proxyAddress?: string;
  proxyPort?: number;
  proxyUsername?: string;
  proxyPassword?: string;
  proxyBypass?: string[];

  // Forwarders
  forwarders: string[] | null;
  forwarderProtocol: ForwarderProtocol;
  concurrentForwarding: boolean;
  forwarderRetries: number;
  forwarderTimeout: number;
  forwarderConcurrency: number;

  // Logging
  enableLogging: boolean;
  loggingType: LoggingType;
  ignoreResolverLogs: boolean;
  logQueries: boolean;
  useLocalTime: boolean;
  logFolder: string;
  maxLogFileDays: number;
  enableInMemoryStats: boolean;
  maxStatFileDays: number;
}

// Partial settings for updates (all fields optional)
export type DnsSettingsUpdate = Partial<Omit<DnsSettings, 'version' | 'uptimestamp'>>;

// Settings grouped by tab for easier form handling
export interface GeneralSettingsForm {
  dnsServerDomain: string;
  dnsServerLocalEndPoints: string[];
  dnsServerIPv4SourceAddresses: string[];
  dnsServerIPv6SourceAddresses: string[];
  defaultRecordTtl: number;
  defaultResponsiblePerson: string | null;
  useSoaSerialDateScheme: boolean;
  minSoaRefresh: number;
  minSoaRetry: number;
  preferIPv6: boolean;
  udpPayloadSize: number;
  zoneTransferAllowedNetworks: string[];
  notifyAllowedNetworks: string[];
  dnsAppsEnableAutomaticUpdate: boolean;
}

export interface WebServiceSettingsForm {
  webServiceLocalAddresses: string[];
  webServiceHttpPort: number;
  webServiceEnableTls: boolean;
  webServiceEnableHttp3: boolean;
  webServiceHttpToTlsRedirect: boolean;
  webServiceUseSelfSignedTlsCertificate: boolean;
  webServiceTlsPort: number;
  webServiceTlsCertificatePath: string | null;
  webServiceTlsCertificatePassword: string;
  webServiceRealIpHeader: string;
}

export interface OptionalProtocolsSettingsForm {
  enableDnsOverUdpProxy: boolean;
  enableDnsOverTcpProxy: boolean;
  enableDnsOverHttp: boolean;
  enableDnsOverTls: boolean;
  enableDnsOverHttps: boolean;
  enableDnsOverHttp3: boolean;
  enableDnsOverQuic: boolean;
  dnsOverUdpProxyPort: number;
  dnsOverTcpProxyPort: number;
  dnsOverHttpPort: number;
  dnsOverTlsPort: number;
  dnsOverHttpsPort: number;
  dnsOverQuicPort: number;
  reverseProxyNetworkACL: string[];
  dnsTlsCertificatePath: string | null;
  dnsTlsCertificatePassword: string;
  dnsOverHttpRealIpHeader: string;
}

export interface RecursionSettingsForm {
  recursion: RecursionMode;
  recursionNetworkACL: string[];
  randomizeName: boolean;
  qnameMinimization: boolean;
  dnssecValidation: boolean;
  eDnsClientSubnet: boolean;
  eDnsClientSubnetIPv4PrefixLength: number;
  eDnsClientSubnetIPv6PrefixLength: number;
  eDnsClientSubnetIpv4Override: string | null;
  eDnsClientSubnetIpv6Override: string | null;
  resolverRetries: number;
  resolverTimeout: number;
  resolverConcurrency: number;
  resolverMaxStackCount: number;
}

export interface CacheSettingsForm {
  saveCache: boolean;
  serveStale: boolean;
  serveStaleTtl: number;
  serveStaleAnswerTtl: number;
  serveStaleResetTtl: number;
  serveStaleMaxWaitTime: number;
  cacheMaximumEntries: number;
  cacheMinimumRecordTtl: number;
  cacheMaximumRecordTtl: number;
  cacheNegativeRecordTtl: number;
  cacheFailureRecordTtl: number;
  cachePrefetchEligibility: number;
  cachePrefetchTrigger: number;
  cachePrefetchSampleIntervalInMinutes: number;
  cachePrefetchSampleEligibilityHitsPerHour: number;
}

export interface ProxyForwardersSettingsForm {
  proxyType: ProxyType;
  proxyAddress: string;
  proxyPort: number;
  proxyUsername: string;
  proxyPassword: string;
  proxyBypass: string[];
  forwarders: string[];
  forwarderProtocol: ForwarderProtocol;
  concurrentForwarding: boolean;
  forwarderRetries: number;
  forwarderTimeout: number;
  forwarderConcurrency: number;
}

export interface LoggingSettingsForm {
  loggingType: LoggingType;
  ignoreResolverLogs: boolean;
  logQueries: boolean;
  useLocalTime: boolean;
  logFolder: string;
  maxLogFileDays: number;
  enableInMemoryStats: boolean;
  maxStatFileDays: number;
}

// Response types
export interface TsigKeyNamesResponse {
  tsigKeyNames: string[];
}
