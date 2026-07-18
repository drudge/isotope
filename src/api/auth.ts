import { apiClient } from './client';
import type { ApiResponse, LoginResponse, SsoStatus, TwoFactorInit, User, UserProfile } from '@/types/api';

export async function login(
  username: string,
  password: string,
  totp?: string
): Promise<ApiResponse<LoginResponse>> {
  const params: Record<string, string> = {
    user: username,
    pass: password,
    includeInfo: 'true',
  };
  if (totp) params.totp = totp;

  const response = await apiClient.postForm<LoginResponse>('/user/login', params);

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

// Accounts with 2FA enabled must also prove a TOTP code, since this call
// re-verifies the password (the server answers 2fa-required otherwise).
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  totp?: string
): Promise<ApiResponse<void>> {
  const params: Record<string, string> = {
    pass: currentPassword,
    newPass: newPassword,
  };
  if (totp) params.totp = totp;
  return apiClient.postForm<void>('/user/changePassword', params);
}

// Unauthenticated; fields returned at the root level like login.
export async function getSsoStatus(): Promise<ApiResponse<SsoStatus>> {
  return apiClient.get<SsoStatus>('/sso/status');
}

export async function getUserProfile(): Promise<ApiResponse<UserProfile>> {
  return apiClient.get<UserProfile>('/user/profile/get');
}

// TOTP two-factor authentication. init returns the otpauth secret and a
// server-rendered QR code PNG; enable confirms setup with a first code.
export async function init2fa(): Promise<ApiResponse<TwoFactorInit>> {
  return apiClient.get<TwoFactorInit>('/user/2fa/init');
}

export async function enable2fa(totp: string): Promise<ApiResponse<void>> {
  return apiClient.postForm<void>('/user/2fa/enable', { totp });
}

export async function disable2fa(): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/user/2fa/disable');
}

// Non-expiring API token tied to this user; authenticated via the current
// session, so no password is needed. The token is returned at the root level
// and is shown only once.
export async function createApiToken(
  tokenName: string
): Promise<ApiResponse<{ username: string; tokenName: string; token: string }>> {
  return apiClient.postForm<{ username: string; tokenName: string; token: string }>(
    '/user/createToken',
    { tokenName }
  );
}

// Revokes one of the current user's sessions or API tokens.
export async function deleteUserSession(
  partialToken: string
): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/user/session/delete', { partialToken });
}
