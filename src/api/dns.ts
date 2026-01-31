import { apiClient } from './client';
import type { ApiResponse, DnsServerInfo, DnsStatsResponse, ZoneListResponse, RecordListResponse } from '@/types/api';

export async function getServerInfo(): Promise<ApiResponse<DnsServerInfo>> {
  return apiClient.get<DnsServerInfo>('/settings/get');
}

export async function getStats(type: 'LastHour' | 'LastDay' | 'LastWeek' | 'LastMonth' | 'LastYear' = 'LastHour'): Promise<ApiResponse<DnsStatsResponse>> {
  return apiClient.get<DnsStatsResponse>('/dashboard/stats/get', { type, utc: 'true' });
}

export async function listZones(): Promise<ApiResponse<ZoneListResponse>> {
  return apiClient.get<ZoneListResponse>('/zones/list');
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

export async function flushCache(): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/cache/flush');
}

export interface DnsApp {
  classPath: string;
  description: string;
  isAppRecordRequestHandler: boolean;
}

export interface InstalledApp {
  name: string;
  version: string;
  dnsApps: DnsApp[];
}

export interface AppsListResponse {
  apps: InstalledApp[];
}

export interface StoreApp {
  name: string;
  version: string;
  description: string;
  url: string;
  size: string;
}

export interface StoreAppsListResponse {
  storeApps: StoreApp[];
}

export async function listApps(): Promise<ApiResponse<AppsListResponse>> {
  return apiClient.get<AppsListResponse>('/apps/list');
}

export async function listStoreApps(): Promise<ApiResponse<StoreAppsListResponse>> {
  return apiClient.get<StoreAppsListResponse>('/apps/listStoreApps');
}

export async function downloadAndInstallApp(name: string, url: string): Promise<ApiResponse<{ installedApp: InstalledApp }>> {
  return apiClient.get<{ installedApp: InstalledApp }>('/apps/downloadAndInstall', { name, url });
}

export async function downloadAndUpdateApp(name: string, url: string): Promise<ApiResponse<{ installedApp: InstalledApp }>> {
  return apiClient.get<{ installedApp: InstalledApp }>('/apps/downloadAndUpdate', { name, url });
}

export async function installApp(name: string, file: File): Promise<ApiResponse<{ installedApp: InstalledApp }>> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.upload<{ installedApp: InstalledApp }>('/apps/install', formData, { name });
}

export async function updateApp(name: string, file: File): Promise<ApiResponse<{ installedApp: InstalledApp }>> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.upload<{ installedApp: InstalledApp }>('/apps/update', formData, { name });
}

export async function uninstallApp(name: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/apps/uninstall', { name });
}

export async function getAppConfig(name: string): Promise<ApiResponse<{ config: string }>> {
  return apiClient.get<{ config: string }>('/apps/config/get', { name });
}

export async function setAppConfig(name: string, config: string): Promise<ApiResponse<void>> {
  return apiClient.post<void>('/apps/config/set', { name }, config);
}
