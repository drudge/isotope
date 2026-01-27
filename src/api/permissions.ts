import { apiClient, type ApiResponse } from './client';

export interface UserPermission {
  username: string;
  canView: boolean;
  canModify: boolean;
  canDelete: boolean;
}

export interface GroupPermission {
  name: string;
  canView: boolean;
  canModify: boolean;
  canDelete: boolean;
}

export interface Permission {
  section: string;
  userPermissions: UserPermission[];
  groupPermissions: GroupPermission[];
}

export interface PermissionsListResponse {
  permissions: Permission[];
}

export interface PermissionDetailsResponse extends Permission {
  users?: Array<{
    displayName: string;
    username: string;
    disabled: boolean;
  }>;
  groups?: Array<{
    name: string;
    description: string;
  }>;
}

export async function listPermissions(): Promise<ApiResponse<PermissionsListResponse>> {
  return apiClient.get('/admin/permissions/list');
}

export async function getPermissionDetails(
  section: string,
  includeUsersAndGroups = false
): Promise<ApiResponse<PermissionDetailsResponse>> {
  return apiClient.get('/admin/permissions/get', {
    section,
    includeUsersAndGroups: includeUsersAndGroups.toString()
  });
}

export async function setPermissions(params: {
  section: string;
  userPermissions?: string;
  groupPermissions?: string;
}): Promise<ApiResponse<Permission>> {
  const apiParams: Record<string, string> = { section: params.section };
  if (params.userPermissions) apiParams.userPermissions = params.userPermissions;
  if (params.groupPermissions) apiParams.groupPermissions = params.groupPermissions;
  return apiClient.get('/admin/permissions/set', apiParams);
}
