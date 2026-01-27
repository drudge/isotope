import { apiClient } from './client';
import type { ApiResponse, LoginResponse, User } from '@/types/api';

export async function login(
  username: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  const response = await apiClient.get<LoginResponse>('/user/login', {
    user: username,
    pass: password,
    includeInfo: 'true',
  });

  if (response.status === 'ok' && response.token) {
    apiClient.setToken(response.token);
  }

  return response;
}

export async function logout(): Promise<ApiResponse<void>> {
  const response = await apiClient.get<void>('/user/logout');
  apiClient.clearToken();
  return response;
}

export async function getSessionInfo(): Promise<ApiResponse<User>> {
  return apiClient.get<User>('/user/session/get');
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/user/changePassword', {
    pass: currentPassword,
    newPass: newPassword,
  });
}
