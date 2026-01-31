import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface Session {
  username: string;
  isCurrentSession: boolean;
  partialToken: string;
  type: 'Standard' | 'ApiToken';
  tokenName: string | null;
  lastSeen: string;
  lastSeenRemoteAddress: string;
  lastSeenUserAgent: string;
}

export interface SessionsListResponse {
  sessions: Session[];
}

export async function listSessions(): Promise<ApiResponse<SessionsListResponse>> {
  return apiClient.get<SessionsListResponse>('/admin/sessions/list');
}

export async function deleteSession(partialToken: string): Promise<ApiResponse<Record<string, never>>> {
  return apiClient.get<Record<string, never>>(`/admin/sessions/delete?partialToken=${encodeURIComponent(partialToken)}`);
}

export async function createToken(
  username: string,
  tokenName: string,
  expirationInDays?: number
): Promise<ApiResponse<{ token: string }>> {
  const params = new URLSearchParams({
    user: username,
    tokenName,
  });

  if (expirationInDays !== undefined) {
    params.append('expiration', expirationInDays.toString());
  }

  return apiClient.get<{ token: string }>(`/admin/sessions/createToken?${params.toString()}`);
}
