import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type {
  ClusterState,
  InitClusterParams,
  JoinClusterParams,
  ClusterOptionsParams,
  UpdatePrimaryParams,
} from '@/types/cluster';

// Get cluster state
export async function getClusterState(
  includeServerIpAddresses: boolean = false
): Promise<ApiResponse<ClusterState>> {
  const params: Record<string, string> = {};
  if (includeServerIpAddresses) {
    params.includeServerIpAddresses = 'true';
  }
  return apiClient.get<ClusterState>('/admin/cluster/state', params);
}

// Initialize new cluster (Primary)
export async function initializeCluster(
  params: InitClusterParams
): Promise<ApiResponse<ClusterState>> {
  return apiClient.get<ClusterState>('/admin/cluster/init', {
    clusterDomain: params.clusterDomain,
    primaryNodeIpAddresses: params.primaryNodeIpAddresses,
  });
}

// Join existing cluster (Secondary)
export async function joinCluster(
  params: JoinClusterParams
): Promise<ApiResponse<ClusterState>> {
  const apiParams: Record<string, string> = {
    secondaryNodeIpAddresses: params.secondaryNodeIpAddresses,
    primaryNodeUrl: params.primaryNodeUrl,
    primaryNodeUsername: params.primaryNodeUsername,
    primaryNodePassword: params.primaryNodePassword,
  };

  if (params.primaryNodeIpAddress) {
    apiParams.primaryNodeIpAddress = params.primaryNodeIpAddress;
  }
  if (params.ignoreCertificateErrors) {
    apiParams.ignoreCertificateErrors = 'true';
  }
  if (params.primaryNodeTotp) {
    apiParams.primaryNodeTotp = params.primaryNodeTotp;
  }

  return apiClient.get<ClusterState>('/admin/cluster/initJoin', apiParams);
}

// Delete cluster (Primary only)
export async function deleteCluster(
  forceDelete: boolean = false
): Promise<ApiResponse<ClusterState>> {
  return apiClient.get<ClusterState>('/admin/cluster/primary/delete', {
    forceDelete: forceDelete.toString(),
  });
}

// Remove secondary gracefully (Primary only)
export async function removeSecondary(
  secondaryNodeId: number
): Promise<ApiResponse<ClusterState>> {
  return apiClient.get<ClusterState>('/admin/cluster/primary/removeSecondary', {
    secondaryNodeId: secondaryNodeId.toString(),
  });
}

// Delete secondary forcefully (Primary only)
export async function deleteSecondary(
  secondaryNodeId: number
): Promise<ApiResponse<ClusterState>> {
  return apiClient.get<ClusterState>('/admin/cluster/primary/deleteSecondary', {
    secondaryNodeId: secondaryNodeId.toString(),
  });
}

// Set cluster options (Primary only)
export async function setClusterOptions(
  params: ClusterOptionsParams
): Promise<ApiResponse<ClusterState>> {
  const apiParams: Record<string, string> = {};

  if (params.heartbeatRefreshIntervalSeconds !== undefined) {
    apiParams.heartbeatRefreshIntervalSeconds = params.heartbeatRefreshIntervalSeconds.toString();
  }
  if (params.heartbeatRetryIntervalSeconds !== undefined) {
    apiParams.heartbeatRetryIntervalSeconds = params.heartbeatRetryIntervalSeconds.toString();
  }
  if (params.configRefreshIntervalSeconds !== undefined) {
    apiParams.configRefreshIntervalSeconds = params.configRefreshIntervalSeconds.toString();
  }
  if (params.configRetryIntervalSeconds !== undefined) {
    apiParams.configRetryIntervalSeconds = params.configRetryIntervalSeconds.toString();
  }

  return apiClient.get<ClusterState>('/admin/cluster/primary/setOptions', apiParams);
}

// Leave cluster (Secondary only)
export async function leaveCluster(
  forceLeave: boolean = false
): Promise<ApiResponse<ClusterState>> {
  return apiClient.get<ClusterState>('/admin/cluster/secondary/leave', {
    forceLeave: forceLeave.toString(),
  });
}

// Resync configuration (Secondary only)
export async function resyncCluster(): Promise<ApiResponse<Record<string, never>>> {
  return apiClient.get<Record<string, never>>('/admin/cluster/secondary/resync');
}

// Promote to primary (Secondary only)
export async function promoteToPrimary(
  forceDeletePrimary: boolean = false
): Promise<ApiResponse<ClusterState>> {
  return apiClient.get<ClusterState>('/admin/cluster/secondary/promote', {
    forceDeletePrimary: forceDeletePrimary.toString(),
  });
}

// Update primary node details (Secondary only)
export async function updatePrimaryNode(
  params: UpdatePrimaryParams
): Promise<ApiResponse<ClusterState>> {
  const apiParams: Record<string, string> = {
    primaryNodeUrl: params.primaryNodeUrl,
  };

  if (params.primaryNodeIpAddresses) {
    apiParams.primaryNodeIpAddresses = params.primaryNodeIpAddresses;
  }

  return apiClient.get<ClusterState>('/admin/cluster/secondary/updatePrimary', apiParams);
}

// Update current node's IP addresses (Both Primary and Secondary)
export async function updateNodeIpAddresses(
  ipAddresses: string
): Promise<ApiResponse<ClusterState>> {
  return apiClient.get<ClusterState>('/admin/cluster/updateIpAddresses', {
    ipAddresses,
  });
}
