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
  const form: Record<string, string> = {
    user: params.username,
    pass: params.password,
  };

  if (params.displayName) {
    form.displayName = params.displayName;
  }

  return apiClient.postForm<User>('/admin/users/create', form);
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
  const form: Record<string, string> = {
    user: params.username,
  };

  if (params.displayName !== undefined) {
    form.displayName = params.displayName;
  }
  if (params.newUsername) {
    form.newUser = params.newUsername;
  }
  if (params.disabled !== undefined) {
    form.disabled = params.disabled.toString();
  }
  if (params.sessionTimeoutSeconds !== undefined) {
    form.sessionTimeoutSeconds = params.sessionTimeoutSeconds.toString();
  }
  if (params.newPassword) {
    form.newPass = params.newPassword;
  }
  if (params.memberOfGroups) {
    form.memberOfGroups = params.memberOfGroups.join(',');
  }

  return apiClient.postForm<UserDetails>('/admin/users/set', form);
}

export async function deleteUser(username: string): Promise<ApiResponse<Record<string, never>>> {
  return apiClient.get<Record<string, never>>(`/admin/users/delete?user=${encodeURIComponent(username)}`);
}
