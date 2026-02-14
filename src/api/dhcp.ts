import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

// Scopes - list endpoint returns lightweight items
export interface DhcpScopeListItem {
  name: string;
  enabled: boolean;
  startingAddress: string;
  endingAddress: string;
  subnetMask: string;
  networkAddress: string;
  broadcastAddress: string;
}

// Scopes - get endpoint returns full detail
export interface DhcpScopeDetail {
  name: string;
  startingAddress: string;
  endingAddress: string;
  subnetMask: string;
  leaseTimeDays: number;
  leaseTimeHours: number;
  leaseTimeMinutes: number;
  offerDelayTime: number;
  pingCheckEnabled: boolean;
  pingCheckTimeout: number;
  pingCheckRetries: number;
  domainName: string;
  domainSearchList: string[];
  dnsUpdates: boolean;
  dnsTtl: number;
  serverAddress: string;
  serverHostName: string;
  bootFileName: string;
  routerAddress: string;
  useThisDnsServer: boolean;
  dnsServers: string[];
  winsServers: string[];
  ntpServers: string[];
  ntpServerDomainNames?: string[];
  staticRoutes: { destination: string; subnetMask: string; router: string }[];
  vendorInfo: { identifier: string; information: string }[];
  capwapAcIpAddresses: string[];
  tftpServerAddresses: string[];
  genericOptions: { code: number; value: string }[];
  exclusions: { startingAddress: string; endingAddress: string }[];
  reservedLeases: { hostName: string | null; hardwareAddress: string; address: string; comments: string }[];
  allowOnlyReservedLeases: boolean;
  blockLocallyAdministeredMacAddresses: boolean;
  ignoreClientIdentifierOption: boolean;
}

export interface DhcpScopesListResponse {
  scopes: DhcpScopeListItem[];
}

export async function listDhcpScopes(): Promise<ApiResponse<DhcpScopesListResponse>> {
  return apiClient.get<DhcpScopesListResponse>('/dhcp/scopes/list');
}

export async function enableDhcpScope(name: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/dhcp/scopes/enable', { name });
}

export async function disableDhcpScope(name: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/dhcp/scopes/disable', { name });
}

export async function deleteDhcpScope(name: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/dhcp/scopes/delete', { name });
}

export interface SetDhcpScopeParams {
  name: string;
  newName?: string;
  startingAddress: string;
  endingAddress: string;
  subnetMask: string;
  leaseTimeDays?: string;
  leaseTimeHours?: string;
  leaseTimeMinutes?: string;
  offerDelayTime?: string;
  pingCheckEnabled?: string;
  pingCheckTimeout?: string;
  pingCheckRetries?: string;
  domainName?: string;
  domainSearchList?: string;
  dnsUpdates?: string;
  dnsTtl?: string;
  serverAddress?: string;
  serverHostName?: string;
  bootFileName?: string;
  routerAddress?: string;
  useThisDnsServer?: string;
  dnsServers?: string;
  winsServers?: string;
  ntpServers?: string;
  ntpServerDomainNames?: string;
  staticRoutes?: string;
  vendorInfo?: string;
  capwapAcIpAddresses?: string;
  tftpServerAddresses?: string;
  genericOptions?: string;
  exclusions?: string;
  reservedLeases?: string;
  allowOnlyReservedLeases?: string;
  blockLocallyAdministeredMacAddresses?: string;
  ignoreClientIdentifierOption?: string;
}

export async function setDhcpScope(params: SetDhcpScopeParams): Promise<ApiResponse<void>> {
  const queryParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams[key] = String(value);
    }
  });
  return apiClient.get<void>('/dhcp/scopes/set', queryParams);
}

export async function getDhcpScope(name: string): Promise<ApiResponse<DhcpScopeDetail>> {
  return apiClient.get<DhcpScopeDetail>('/dhcp/scopes/get', { name });
}

// Leases
export interface DhcpLease {
  scope: string;
  type: string;
  hardwareAddress: string;
  clientIdentifier: string;
  address: string;
  hostName: string;
  leaseObtained: string;
  leaseExpires: string;
}

export interface DhcpLeasesListResponse {
  leases: DhcpLease[];
}

export async function listDhcpLeases(): Promise<ApiResponse<DhcpLeasesListResponse>> {
  return apiClient.get<DhcpLeasesListResponse>('/dhcp/leases/list');
}

export async function removeDhcpLease(name: string, hardwareAddress: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/dhcp/leases/remove', { name, hardwareAddress });
}

export async function convertLeaseToReserved(name: string, hardwareAddress: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/dhcp/leases/convertToReserved', { name, hardwareAddress });
}

export async function convertLeaseToDynamic(name: string, hardwareAddress: string): Promise<ApiResponse<void>> {
  return apiClient.get<void>('/dhcp/leases/convertToDynamic', { name, hardwareAddress });
}
