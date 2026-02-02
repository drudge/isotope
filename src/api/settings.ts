import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type {
  DnsSettings,
  DnsSettingsUpdate,
  TsigKey,
  TsigKeyNamesResponse,
  QpmPrefixLimit,
} from '@/types/settings';

// Get all DNS settings
export async function getSettings(): Promise<ApiResponse<DnsSettings>> {
  return apiClient.get<DnsSettings>('/settings/get');
}

// Helper to serialize array values
function serializeArray(arr: string[] | number[] | undefined): string | undefined {
  if (arr === undefined) return undefined;
  if (arr.length === 0) return 'false'; // API uses 'false' to clear arrays
  return arr.join(',');
}

// Helper to serialize TSIG keys (pipe-separated format)
function serializeTsigKeys(keys: TsigKey[] | undefined): string | undefined {
  if (keys === undefined) return undefined;
  if (keys.length === 0) return 'false';
  return keys.map(k => `${k.keyName},${k.sharedSecret},${k.algorithmName}`).join('|');
}

// Helper to serialize QPM prefix limits (pipe-separated format)
function serializeQpmLimits(limits: QpmPrefixLimit[] | undefined): string | undefined {
  if (limits === undefined) return undefined;
  if (limits.length === 0) return 'false';
  return limits.map(l => `${l.prefix},${l.udpLimit},${l.tcpLimit}`).join('|');
}

// Update DNS settings
export async function updateSettings(
  settings: DnsSettingsUpdate
): Promise<ApiResponse<DnsSettings>> {
  const params: Record<string, string> = {};

  // General settings
  if (settings.dnsServerDomain !== undefined) {
    params.dnsServerDomain = settings.dnsServerDomain;
  }
  if (settings.dnsServerLocalEndPoints !== undefined) {
    params.dnsServerLocalEndPoints = settings.dnsServerLocalEndPoints.join(',');
  }
  if (settings.dnsServerIPv4SourceAddresses !== undefined) {
    params.dnsServerIPv4SourceAddresses = serializeArray(settings.dnsServerIPv4SourceAddresses) || '';
  }
  if (settings.dnsServerIPv6SourceAddresses !== undefined) {
    params.dnsServerIPv6SourceAddresses = serializeArray(settings.dnsServerIPv6SourceAddresses) || '';
  }
  if (settings.defaultRecordTtl !== undefined) {
    params.defaultRecordTtl = String(settings.defaultRecordTtl);
  }
  if (settings.defaultResponsiblePerson !== undefined) {
    params.defaultResponsiblePerson = settings.defaultResponsiblePerson || '';
  }
  if (settings.useSoaSerialDateScheme !== undefined) {
    params.useSoaSerialDateScheme = String(settings.useSoaSerialDateScheme);
  }
  if (settings.minSoaRefresh !== undefined) {
    params.minSoaRefresh = String(settings.minSoaRefresh);
  }
  if (settings.minSoaRetry !== undefined) {
    params.minSoaRetry = String(settings.minSoaRetry);
  }
  if (settings.zoneTransferAllowedNetworks !== undefined) {
    const val = serializeArray(settings.zoneTransferAllowedNetworks);
    if (val) params.zoneTransferAllowedNetworks = val;
  }
  if (settings.notifyAllowedNetworks !== undefined) {
    const val = serializeArray(settings.notifyAllowedNetworks);
    if (val) params.notifyAllowedNetworks = val;
  }
  if (settings.dnsAppsEnableAutomaticUpdate !== undefined) {
    params.dnsAppsEnableAutomaticUpdate = String(settings.dnsAppsEnableAutomaticUpdate);
  }
  if (settings.preferIPv6 !== undefined) {
    params.preferIPv6 = String(settings.preferIPv6);
  }
  if (settings.udpPayloadSize !== undefined) {
    params.udpPayloadSize = String(settings.udpPayloadSize);
  }

  // UDP Socket Pool
  if (settings.enableUdpSocketPool !== undefined) {
    params.enableUdpSocketPool = String(settings.enableUdpSocketPool);
  }
  if (settings.socketPoolExcludedPorts !== undefined) {
    params.socketPoolExcludedPorts = settings.socketPoolExcludedPorts.join(',');
  }

  // DNSSEC & EDNS
  if (settings.dnssecValidation !== undefined) {
    params.dnssecValidation = String(settings.dnssecValidation);
  }
  if (settings.eDnsClientSubnet !== undefined) {
    params.eDnsClientSubnet = String(settings.eDnsClientSubnet);
  }
  if (settings.eDnsClientSubnetIPv4PrefixLength !== undefined) {
    params.eDnsClientSubnetIPv4PrefixLength = String(settings.eDnsClientSubnetIPv4PrefixLength);
  }
  if (settings.eDnsClientSubnetIPv6PrefixLength !== undefined) {
    params.eDnsClientSubnetIPv6PrefixLength = String(settings.eDnsClientSubnetIPv6PrefixLength);
  }
  if (settings.eDnsClientSubnetIpv4Override !== undefined) {
    params.eDnsClientSubnetIpv4Override = settings.eDnsClientSubnetIpv4Override || '';
  }
  if (settings.eDnsClientSubnetIpv6Override !== undefined) {
    params.eDnsClientSubnetIpv6Override = settings.eDnsClientSubnetIpv6Override || '';
  }

  // QPM Rate Limiting
  if (settings.qpmPrefixLimitsIPv4 !== undefined) {
    const val = serializeQpmLimits(settings.qpmPrefixLimitsIPv4);
    if (val) params.qpmPrefixLimitsIPv4 = val;
  }
  if (settings.qpmPrefixLimitsIPv6 !== undefined) {
    const val = serializeQpmLimits(settings.qpmPrefixLimitsIPv6);
    if (val) params.qpmPrefixLimitsIPv6 = val;
  }
  if (settings.qpmLimitSampleMinutes !== undefined) {
    params.qpmLimitSampleMinutes = String(settings.qpmLimitSampleMinutes);
  }
  if (settings.qpmLimitUdpTruncationPercentage !== undefined) {
    params.qpmLimitUdpTruncationPercentage = String(settings.qpmLimitUdpTruncationPercentage);
  }
  if (settings.qpmLimitBypassList !== undefined) {
    const val = serializeArray(settings.qpmLimitBypassList);
    if (val) params.qpmLimitBypassList = val;
  }

  // Timeouts
  if (settings.clientTimeout !== undefined) {
    params.clientTimeout = String(settings.clientTimeout);
  }
  if (settings.tcpSendTimeout !== undefined) {
    params.tcpSendTimeout = String(settings.tcpSendTimeout);
  }
  if (settings.tcpReceiveTimeout !== undefined) {
    params.tcpReceiveTimeout = String(settings.tcpReceiveTimeout);
  }
  if (settings.quicIdleTimeout !== undefined) {
    params.quicIdleTimeout = String(settings.quicIdleTimeout);
  }
  if (settings.quicMaxInboundStreams !== undefined) {
    params.quicMaxInboundStreams = String(settings.quicMaxInboundStreams);
  }
  if (settings.listenBacklog !== undefined) {
    params.listenBacklog = String(settings.listenBacklog);
  }
  if (settings.maxConcurrentResolutionsPerCore !== undefined) {
    params.maxConcurrentResolutionsPerCore = String(settings.maxConcurrentResolutionsPerCore);
  }

  // Web Service
  if (settings.webServiceLocalAddresses !== undefined) {
    params.webServiceLocalAddresses = settings.webServiceLocalAddresses.join(',');
  }
  if (settings.webServiceHttpPort !== undefined) {
    params.webServiceHttpPort = String(settings.webServiceHttpPort);
  }
  if (settings.webServiceEnableTls !== undefined) {
    params.webServiceEnableTls = String(settings.webServiceEnableTls);
  }
  if (settings.webServiceEnableHttp3 !== undefined) {
    params.webServiceEnableHttp3 = String(settings.webServiceEnableHttp3);
  }
  if (settings.webServiceHttpToTlsRedirect !== undefined) {
    params.webServiceHttpToTlsRedirect = String(settings.webServiceHttpToTlsRedirect);
  }
  if (settings.webServiceUseSelfSignedTlsCertificate !== undefined) {
    params.webServiceUseSelfSignedTlsCertificate = String(settings.webServiceUseSelfSignedTlsCertificate);
  }
  if (settings.webServiceTlsPort !== undefined) {
    params.webServiceTlsPort = String(settings.webServiceTlsPort);
  }
  if (settings.webServiceTlsCertificatePath !== undefined) {
    params.webServiceTlsCertificatePath = settings.webServiceTlsCertificatePath || '';
  }
  if (settings.webServiceTlsCertificatePassword !== undefined) {
    params.webServiceTlsCertificatePassword = settings.webServiceTlsCertificatePassword;
  }
  if (settings.webServiceRealIpHeader !== undefined) {
    params.webServiceRealIpHeader = settings.webServiceRealIpHeader;
  }

  // Optional Protocols
  if (settings.enableDnsOverUdpProxy !== undefined) {
    params.enableDnsOverUdpProxy = String(settings.enableDnsOverUdpProxy);
  }
  if (settings.enableDnsOverTcpProxy !== undefined) {
    params.enableDnsOverTcpProxy = String(settings.enableDnsOverTcpProxy);
  }
  if (settings.enableDnsOverHttp !== undefined) {
    params.enableDnsOverHttp = String(settings.enableDnsOverHttp);
  }
  if (settings.enableDnsOverTls !== undefined) {
    params.enableDnsOverTls = String(settings.enableDnsOverTls);
  }
  if (settings.enableDnsOverHttps !== undefined) {
    params.enableDnsOverHttps = String(settings.enableDnsOverHttps);
  }
  if (settings.enableDnsOverHttp3 !== undefined) {
    params.enableDnsOverHttp3 = String(settings.enableDnsOverHttp3);
  }
  if (settings.enableDnsOverQuic !== undefined) {
    params.enableDnsOverQuic = String(settings.enableDnsOverQuic);
  }
  if (settings.dnsOverUdpProxyPort !== undefined) {
    params.dnsOverUdpProxyPort = String(settings.dnsOverUdpProxyPort);
  }
  if (settings.dnsOverTcpProxyPort !== undefined) {
    params.dnsOverTcpProxyPort = String(settings.dnsOverTcpProxyPort);
  }
  if (settings.dnsOverHttpPort !== undefined) {
    params.dnsOverHttpPort = String(settings.dnsOverHttpPort);
  }
  if (settings.dnsOverTlsPort !== undefined) {
    params.dnsOverTlsPort = String(settings.dnsOverTlsPort);
  }
  if (settings.dnsOverHttpsPort !== undefined) {
    params.dnsOverHttpsPort = String(settings.dnsOverHttpsPort);
  }
  if (settings.dnsOverQuicPort !== undefined) {
    params.dnsOverQuicPort = String(settings.dnsOverQuicPort);
  }
  if (settings.reverseProxyNetworkACL !== undefined) {
    const val = serializeArray(settings.reverseProxyNetworkACL);
    if (val) params.reverseProxyNetworkACL = val;
  }
  if (settings.dnsTlsCertificatePath !== undefined) {
    params.dnsTlsCertificatePath = settings.dnsTlsCertificatePath || '';
  }
  if (settings.dnsTlsCertificatePassword !== undefined) {
    params.dnsTlsCertificatePassword = settings.dnsTlsCertificatePassword;
  }
  if (settings.dnsOverHttpRealIpHeader !== undefined) {
    params.dnsOverHttpRealIpHeader = settings.dnsOverHttpRealIpHeader;
  }

  // TSIG
  if (settings.tsigKeys !== undefined) {
    const val = serializeTsigKeys(settings.tsigKeys);
    if (val) params.tsigKeys = val;
  }

  // Recursion
  if (settings.recursion !== undefined) {
    params.recursion = settings.recursion;
  }
  if (settings.recursionNetworkACL !== undefined) {
    const val = serializeArray(settings.recursionNetworkACL);
    if (val) params.recursionNetworkACL = val;
  }
  if (settings.randomizeName !== undefined) {
    params.randomizeName = String(settings.randomizeName);
  }
  if (settings.qnameMinimization !== undefined) {
    params.qnameMinimization = String(settings.qnameMinimization);
  }
  if (settings.resolverRetries !== undefined) {
    params.resolverRetries = String(settings.resolverRetries);
  }
  if (settings.resolverTimeout !== undefined) {
    params.resolverTimeout = String(settings.resolverTimeout);
  }
  if (settings.resolverConcurrency !== undefined) {
    params.resolverConcurrency = String(settings.resolverConcurrency);
  }
  if (settings.resolverMaxStackCount !== undefined) {
    params.resolverMaxStackCount = String(settings.resolverMaxStackCount);
  }

  // Cache
  if (settings.saveCache !== undefined) {
    params.saveCache = String(settings.saveCache);
  }
  if (settings.serveStale !== undefined) {
    params.serveStale = String(settings.serveStale);
  }
  if (settings.serveStaleTtl !== undefined) {
    params.serveStaleTtl = String(settings.serveStaleTtl);
  }
  if (settings.serveStaleAnswerTtl !== undefined) {
    params.serveStaleAnswerTtl = String(settings.serveStaleAnswerTtl);
  }
  if (settings.serveStaleResetTtl !== undefined) {
    params.serveStaleResetTtl = String(settings.serveStaleResetTtl);
  }
  if (settings.serveStaleMaxWaitTime !== undefined) {
    params.serveStaleMaxWaitTime = String(settings.serveStaleMaxWaitTime);
  }
  if (settings.cacheMaximumEntries !== undefined) {
    params.cacheMaximumEntries = String(settings.cacheMaximumEntries);
  }
  if (settings.cacheMinimumRecordTtl !== undefined) {
    params.cacheMinimumRecordTtl = String(settings.cacheMinimumRecordTtl);
  }
  if (settings.cacheMaximumRecordTtl !== undefined) {
    params.cacheMaximumRecordTtl = String(settings.cacheMaximumRecordTtl);
  }
  if (settings.cacheNegativeRecordTtl !== undefined) {
    params.cacheNegativeRecordTtl = String(settings.cacheNegativeRecordTtl);
  }
  if (settings.cacheFailureRecordTtl !== undefined) {
    params.cacheFailureRecordTtl = String(settings.cacheFailureRecordTtl);
  }
  if (settings.cachePrefetchEligibility !== undefined) {
    params.cachePrefetchEligibility = String(settings.cachePrefetchEligibility);
  }
  if (settings.cachePrefetchTrigger !== undefined) {
    params.cachePrefetchTrigger = String(settings.cachePrefetchTrigger);
  }
  if (settings.cachePrefetchSampleIntervalInMinutes !== undefined) {
    params.cachePrefetchSampleIntervalInMinutes = String(settings.cachePrefetchSampleIntervalInMinutes);
  }
  if (settings.cachePrefetchSampleEligibilityHitsPerHour !== undefined) {
    params.cachePrefetchSampleEligibilityHitsPerHour = String(settings.cachePrefetchSampleEligibilityHitsPerHour);
  }

  // Blocking (these are also in blocking.ts, but included for completeness)
  if (settings.enableBlocking !== undefined) {
    params.enableBlocking = String(settings.enableBlocking);
  }
  if (settings.allowTxtBlockingReport !== undefined) {
    params.allowTxtBlockingReport = String(settings.allowTxtBlockingReport);
  }
  if (settings.blockingBypassList !== undefined) {
    const val = serializeArray(settings.blockingBypassList);
    if (val) params.blockingBypassList = val;
  }
  if (settings.blockingType !== undefined) {
    params.blockingType = settings.blockingType;
  }
  if (settings.blockingAnswerTtl !== undefined) {
    params.blockingAnswerTtl = String(settings.blockingAnswerTtl);
  }
  if (settings.customBlockingAddresses !== undefined) {
    const val = serializeArray(settings.customBlockingAddresses);
    if (val) params.customBlockingAddresses = val;
  }
  if (settings.blockListUrls !== undefined) {
    const val = serializeArray(settings.blockListUrls);
    if (val) params.blockListUrls = val;
  }
  if (settings.blockListUpdateIntervalHours !== undefined) {
    params.blockListUpdateIntervalHours = String(settings.blockListUpdateIntervalHours);
  }

  // Proxy
  if (settings.proxyType !== undefined) {
    params.proxyType = settings.proxyType;
  }
  if (settings.proxyAddress !== undefined) {
    params.proxyAddress = settings.proxyAddress;
  }
  if (settings.proxyPort !== undefined) {
    params.proxyPort = String(settings.proxyPort);
  }
  if (settings.proxyUsername !== undefined) {
    params.proxyUsername = settings.proxyUsername;
  }
  if (settings.proxyPassword !== undefined) {
    params.proxyPassword = settings.proxyPassword;
  }
  if (settings.proxyBypass !== undefined) {
    const val = serializeArray(settings.proxyBypass);
    if (val) params.proxyBypass = val;
  }

  // Forwarders
  if (settings.forwarders !== undefined) {
    if (settings.forwarders === null || settings.forwarders.length === 0) {
      params.forwarders = 'false';
    } else {
      params.forwarders = settings.forwarders.join(',');
    }
  }
  if (settings.forwarderProtocol !== undefined) {
    params.forwarderProtocol = settings.forwarderProtocol;
  }
  if (settings.concurrentForwarding !== undefined) {
    params.concurrentForwarding = String(settings.concurrentForwarding);
  }
  if (settings.forwarderRetries !== undefined) {
    params.forwarderRetries = String(settings.forwarderRetries);
  }
  if (settings.forwarderTimeout !== undefined) {
    params.forwarderTimeout = String(settings.forwarderTimeout);
  }
  if (settings.forwarderConcurrency !== undefined) {
    params.forwarderConcurrency = String(settings.forwarderConcurrency);
  }

  // Logging
  if (settings.loggingType !== undefined) {
    params.loggingType = settings.loggingType;
  }
  if (settings.enableLogging !== undefined) {
    params.enableLogging = String(settings.enableLogging);
  }
  if (settings.ignoreResolverLogs !== undefined) {
    params.ignoreResolverLogs = String(settings.ignoreResolverLogs);
  }
  if (settings.logQueries !== undefined) {
    params.logQueries = String(settings.logQueries);
  }
  if (settings.useLocalTime !== undefined) {
    params.useLocalTime = String(settings.useLocalTime);
  }
  if (settings.logFolder !== undefined) {
    params.logFolder = settings.logFolder;
  }
  if (settings.maxLogFileDays !== undefined) {
    params.maxLogFileDays = String(settings.maxLogFileDays);
  }
  if (settings.enableInMemoryStats !== undefined) {
    params.enableInMemoryStats = String(settings.enableInMemoryStats);
  }
  if (settings.maxStatFileDays !== undefined) {
    params.maxStatFileDays = String(settings.maxStatFileDays);
  }

  return apiClient.get<DnsSettings>('/settings/set', params);
}

// Get TSIG key names
export async function getTsigKeyNames(): Promise<ApiResponse<TsigKeyNamesResponse>> {
  return apiClient.get<TsigKeyNamesResponse>('/settings/getTsigKeyNames');
}
