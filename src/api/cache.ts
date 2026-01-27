import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface DnsRecord {
  name: string;
  type: string;
  ttl: string;
  rData: Record<string, unknown>;
}

export interface CacheListResponse {
  domain: string;
  zones: string[];
  records: DnsRecord[];
}

export async function listCachedZones(domain?: string, direction?: 'up' | 'down'): Promise<ApiResponse<CacheListResponse>> {
  const params: Record<string, string> = {};
  if (domain) params.domain = domain;
  if (direction) params.direction = direction;
  return apiClient.get<CacheListResponse>('/cache/list', params);
}

export async function deleteCachedZone(domain: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/cache/delete', { domain });
}

export async function flushCache(): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/cache/flush');
}
