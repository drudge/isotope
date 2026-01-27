import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export interface User {
  displayName: string;
  username: string;
  disabled: boolean;
  previousSessionLoggedOn: string;
  previousSessionRemoteAddress: string;
  recentSessionLoggedOn: string;
  recentSessionRemoteAddress: string;
}

export interface UserDetails extends User {
  totpEnabled: boolean;
  sessionTimeoutSeconds: number;
  memberOfGroups?: string[];
}

export interface UsersListResponse {
  users: User[];
}

export async function listUsers(): Promise<ApiResponse<UsersListResponse>> {
  return apiClient.get<UsersListResponse>('/admin/users/list');
}

export async function createUser(params: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<ApiResponse<User>> {
  const queryParams = new URLSearchParams({
    user: params.username,
    pass: params.password,
  });

  if (params.displayName) {
    queryParams.append('displayName', params.displayName);
  }

  return apiClient.get<User>(`/admin/users/create?${queryParams.toString()}`);
}

export async function getUserDetails(username: string, includeGroups = false): Promise<ApiResponse<UserDetails>> {
  return apiClient.get<UserDetails>(`/admin/users/get?user=${encodeURIComponent(username)}&includeGroups=${includeGroups}`);
}

export async function setUserDetails(params: {
  username: string;
  displayName?: string;
  newUsername?: string;
  disabled?: boolean;
  sessionTimeoutSeconds?: number;
  newPassword?: string;
  memberOfGroups?: string[];
}): Promise<ApiResponse<UserDetails>> {
  const queryParams = new URLSearchParams({
    user: params.username,
  });

  if (params.displayName !== undefined) {
    queryParams.append('displayName', params.displayName);
  }
  if (params.newUsername) {
    queryParams.append('newUser', params.newUsername);
  }
  if (params.disabled !== undefined) {
    queryParams.append('disabled', params.disabled.toString());
  }
  if (params.sessionTimeoutSeconds !== undefined) {
    queryParams.append('sessionTimeoutSeconds', params.sessionTimeoutSeconds.toString());
  }
  if (params.newPassword) {
    queryParams.append('newPass', params.newPassword);
  }
  if (params.memberOfGroups) {
    queryParams.append('memberOfGroups', params.memberOfGroups.join(','));
  }

  return apiClient.get<UserDetails>(`/admin/users/set?${queryParams.toString()}`);
}

export async function deleteUser(username: string): Promise<ApiResponse<{}>> {
  return apiClient.get<{}>(`/admin/users/delete?user=${encodeURIComponent(username)}`);
}
