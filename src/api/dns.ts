import { apiClient } from './client';
import type { ApiResponse, DnsRecord, DnsServerInfo, DnsStatsResponse, Zone, ZoneListResponse, ZoneOptions, ZonePermissions, ZoneUserPermission, ZoneGroupPermission, RecordListResponse } from '@/types/api';

export async function getServerInfo(): Promise<ApiResponse<DnsServerInfo>> {
  return apiClient.get<DnsServerInfo>('/settings/get');
}

export type StatsType = 'LastHour' | 'LastDay' | 'LastWeek' | 'LastMonth' | 'LastYear' | 'Custom';

export async function getStats(
  type: StatsType = 'LastHour',
  options?: { start?: string; end?: string },
): Promise<ApiResponse<DnsStatsResponse>> {
  const params: Record<string, string> = { type, utc: 'true' };
  if (type === 'Custom') {
    if (options?.start) params.start = options.start;
    if (options?.end) params.end = options.end;
  }
  return apiClient.get<DnsStatsResponse>('/dashboard/stats/get', params);
}

export async function listZones(options?: {
  pageNumber?: number;
  zonesPerPage?: number;
}): Promise<ApiResponse<ZoneListResponse>> {
  const params: Record<string, string> = {};
  if (options?.pageNumber !== undefined) {
    params.pageNumber = String(options.pageNumber);
    if (options.zonesPerPage !== undefined) params.zonesPerPage = String(options.zonesPerPage);
  }
  return apiClient.get<ZoneListResponse>('/zones/list', params);
}

export async function getZoneRecords(domain: string, zone?: string, listZone?: boolean): Promise<ApiResponse<RecordListResponse>> {
  const params: Record<string, string> = { domain };
  if (zone) params.zone = zone;
  if (listZone !== undefined) params.listZone = listZone.toString();
  return apiClient.get<RecordListResponse>('/zones/records/get', params);
}

export async function createZone(
  zone: string,
  type: string
): Promise<ApiResponse<{ domain: string }>> {
  return apiClient.get<{ domain: string }>('/zones/create', { zone, type });
}

export async function deleteZone(zone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/delete', { zone });
}

export async function enableZone(zone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/enable', { zone });
}

export async function disableZone(zone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/disable', { zone });
}

export async function addRecord(
  zone: string,
  domain: string,
  type: string,
  ttl: number,
  rdata: Record<string, string>,
  options?: {
    comments?: string;
    expiryTtl?: number;
    ptr?: boolean;
    createPtrZone?: boolean;
  }
): Promise<ApiResponse<void>> {
  const params: Record<string, string> = {
    zone,
    domain,
    type,
    ttl: ttl.toString(),
    ...rdata,
  };

  if (options?.comments) params.comments = options.comments;
  if (options?.expiryTtl !== undefined && options.expiryTtl > 0) params.expiryTtl = options.expiryTtl.toString();
  if (options?.ptr) params.ptr = 'true';
  if (options?.createPtrZone) params.createPtrZone = 'true';

  return apiClient.get<void>('/zones/records/add', params);
}

export async function deleteRecord(
  zone: string,
  domain: string,
  type: string,
  rdata: Record<string, string>
): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/records/delete', {
    zone,
    domain,
    type,
    ...rdata,
  });
}

// Atomically updates a record in place. `rdata` carries the current values
// plus the `new*` replacements per the record type (e.g. ipAddress +
// newIpAddress for A/AAAA); the server keys the record by the current values.
export async function updateRecord(
  zone: string,
  domain: string,
  type: string,
  rdata: Record<string, string>,
  options?: {
    newDomain?: string;
    ttl?: number;
    disable?: boolean;
    comments?: string;
    expiryTtl?: number;
    ptr?: boolean;
    createPtrZone?: boolean;
  }
): Promise<ApiResponse<{ zone: Zone; updatedRecord: DnsRecord }>> {
  const params: Record<string, string> = {
    zone,
    domain,
    type,
    ...rdata,
  };

  if (options?.newDomain && options.newDomain !== domain) params.newDomain = options.newDomain;
  if (options?.ttl !== undefined) params.ttl = options.ttl.toString();
  if (options?.disable !== undefined) params.disable = String(options.disable);
  if (options?.comments !== undefined) params.comments = options.comments;
  if (options?.expiryTtl !== undefined) params.expiryTtl = options.expiryTtl.toString();
  if (options?.ptr) params.ptr = 'true';
  if (options?.createPtrZone) params.createPtrZone = 'true';

  return apiClient.get<{ zone: Zone; updatedRecord: DnsRecord }>('/zones/records/update', params);
}

// Zone options (query access, zone transfer, notify, dynamic updates)
export async function getZoneOptions(zone: string): Promise<ApiResponse<ZoneOptions>> {
  return apiClient.get<ZoneOptions>('/zones/options/get', {
    zone,
    includeAvailableCatalogZoneNames: 'true',
    includeAvailableTsigKeyNames: 'true',
  });
}

// Values are pre-stringified by the caller (lists comma separated, `false`
// to clear a list, updateSecurityPolicies as pipe-separated table data).
export async function setZoneOptions(
  zone: string,
  options: Record<string, string>
): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/options/set', { zone, ...options });
}

// Per-zone permissions
export async function getZonePermissions(zone: string): Promise<ApiResponse<ZonePermissions>> {
  return apiClient.get<ZonePermissions>('/zones/permissions/get', {
    zone,
    includeUsersAndGroups: 'true',
  });
}

export async function setZonePermissions(
  zone: string,
  userPermissions: ZoneUserPermission[],
  groupPermissions: ZoneGroupPermission[]
): Promise<ApiResponse<ZonePermissions>> {
  return apiClient.get<ZonePermissions>('/zones/permissions/set', {
    zone,
    userPermissions: userPermissions
      .map((p) => [p.username, p.canView, p.canModify, p.canDelete].join('|'))
      .join('|'),
    groupPermissions: groupPermissions
      .map((p) => [p.name, p.canView, p.canModify, p.canDelete].join('|'))
      .join('|'),
  });
}

// Zone file import/export and lifecycle helpers
export async function importZone(
  zone: string,
  zoneFileText: string,
  options?: { overwrite?: boolean; overwriteZone?: boolean; overwriteSoaSerial?: boolean }
): Promise<ApiResponse<void>> {
  const params: Record<string, string> = { zone };
  if (options?.overwrite !== undefined) params.overwrite = String(options.overwrite);
  if (options?.overwriteZone !== undefined) params.overwriteZone = String(options.overwriteZone);
  if (options?.overwriteSoaSerial !== undefined) params.overwriteSoaSerial = String(options.overwriteSoaSerial);
  return apiClient.postText<void>('/zones/import', params, zoneFileText);
}

export async function exportZone(zone: string): Promise<{ blob: Blob; filename: string }> {
  const { blob, filename } = await apiClient.download('/zones/export', { zone });
  return { blob, filename: filename ?? `${zone}.zone` };
}

export async function cloneZone(zone: string, sourceZone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/clone', { zone, sourceZone });
}

export async function convertZone(zone: string, type: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/convert', { zone, type });
}

export async function resyncZone(zone: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/zones/resync', { zone });
}
