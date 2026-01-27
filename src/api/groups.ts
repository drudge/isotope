import { apiClient, type ApiResponse } from './client';

export interface Group {
  name: string;
  description: string;
  members?: string[];
  users?: Array<{
    displayName: string;
    username: string;
    disabled: boolean;
  }>;
}

export interface GroupsListResponse {
  groups: Group[];
}

export interface GroupDetailsResponse extends Group {
  members: string[];
}

export async function listGroups(): Promise<ApiResponse<GroupsListResponse>> {
  return apiClient.get('/admin/groups/list');
}

export async function createGroup(params: {
  group: string;
  description?: string;
}): Promise<ApiResponse<Group>> {
  const apiParams: Record<string, string> = { group: params.group };
  if (params.description) apiParams.description = params.description;
  return apiClient.get('/admin/groups/create', apiParams);
}

export async function getGroupDetails(
  group: string,
  includeUsers = false
): Promise<ApiResponse<Group>> {
  return apiClient.get('/admin/groups/get', {
    group,
    includeUsers: includeUsers.toString()
  });
}

export async function setGroupDetails(params: {
  group: string;
  newGroup?: string;
  description?: string;
  members?: string;
}): Promise<ApiResponse<GroupDetailsResponse>> {
  const apiParams: Record<string, string> = { group: params.group };
  if (params.newGroup) apiParams.newGroup = params.newGroup;
  if (params.description) apiParams.description = params.description;
  if (params.members) apiParams.members = params.members;
  return apiClient.get('/admin/groups/set', apiParams);
}

export async function deleteGroup(group: string): Promise<ApiResponse<{}>> {
  return apiClient.get('/admin/groups/delete', { group });
}
