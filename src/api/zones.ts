import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface ZoneListResponse {
  domain: string;
  zones: string[];
}

// Allowed Zones
export async function listAllowedZones(): Promise<ApiResponse<ZoneListResponse>> {
  // The /allowed/list endpoint is for browsing DNS records, not listing allowed zones
  // We need to use /allowed/export to get the list of allowed zones
  const token = sessionStorage.getItem('technitium_token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`/api/allowed/export?token=${token}`);
  const text = await response.text();

  if (!response.ok) {
    return { status: 'error', errorMessage: 'Failed to fetch allowed zones' };
  }

  // Parse the text file - each line is a domain
  const zones = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  return {
    status: 'ok',
    response: {
      domain: '',
      zones: zones
    }
  };
}

export async function addAllowedZone(domain: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/allowed/add', { domain });
}

export async function deleteAllowedZone(domain: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/allowed/delete', { domain });
}

export async function flushAllowedZones(): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/allowed/flush');
}

export async function importAllowedZones(zones: string[]): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/allowed/import', { allowedZones: zones.join(',') });
}

// Blocked Zones
export async function listBlockedZones(): Promise<ApiResponse<ZoneListResponse>> {
  // The /blocked/list endpoint is for browsing DNS records, not listing blocked zones
  // We need to use /blocked/export to get the list of blocked zones
  const token = sessionStorage.getItem('technitium_token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`/api/blocked/export?token=${token}`);
  const text = await response.text();

  if (!response.ok) {
    return { status: 'error', errorMessage: 'Failed to fetch blocked zones' };
  }

  // Parse the text file - each line is a domain
  const zones = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  return {
    status: 'ok',
    response: {
      domain: '',
      zones: zones
    }
  };
}

export async function addBlockedZone(domain: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/blocked/add', { domain });
}

export async function deleteBlockedZone(domain: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/blocked/delete', { domain });
}

export async function flushBlockedZones(): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/blocked/flush');
}

export async function importBlockedZones(zones: string[]): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/blocked/import', { blockedZones: zones.join(',') });
}
