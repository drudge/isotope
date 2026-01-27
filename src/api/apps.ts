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

export async function listApps(): Promise<ApiResponse<AppsListResponse>> {
  return apiClient.get<AppsListResponse>('/apps/list');
}
