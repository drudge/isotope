import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface DnsApp {
  classPath: string;
  description: string;
  isAppRecordRequestHandler: boolean;
  isRequestController: boolean;
  isAuthoritativeRequestHandler: boolean;
  isRequestBlockingHandler: boolean;
  isQueryLogger: boolean;
  isPostProcessor: boolean;
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
  installed?: boolean;
  installedVersion?: string;
  updateAvailable?: boolean;
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

export async function uninstallApp(name: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/apps/uninstall', { name });
}

export async function getAppConfig(name: string): Promise<ApiResponse<{ config: string }>> {
  return apiClient.get<{ config: string }>('/apps/config/get', { name });
}

export async function setAppConfig(name: string, config: string): Promise<ApiResponse<void>> {
  return apiClient.post<void>('/apps/config/set', { name }, config);
}
