import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type {
  ClusterState,
  InitClusterParams,
  JoinClusterParams,
  ClusterOptionsParams,
  UpdatePrimaryParams,
  JoinNodeParams,
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

  // POST form body: carries the primary node admin's password (docs also
  // specify POST for this call).
  return apiClient.postForm<ClusterState>('/admin/cluster/initJoin', apiParams);
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
  return apiClient.get<ClusterState>('/admin/cluster/updateIpAddress', {
    ipAddresses,
  });
}

// Same-origin prefix handled by the cluster-node proxy (Vite dev/preview and the
// nginx image). It forwards /cluster-node/<scheme>/<host>/... to that node's own
// web service so the browser never makes a cross-origin call (Technitium sends
// no CORS headers). The target host is allow-listed server-side.
const CLUSTER_NODE_PROXY_PREFIX = '/cluster-node';

// Build the proxied API base for a node's web URL, e.g.
//   http://ns2.example.com:5380  ->  /cluster-node/http/ns2.example.com:5380/api
// The host is left unencoded (a colon is valid in a non-leading path segment) so
// both the Vite middleware and the nginx regex capture a clean host:port.
function nodeApiBase(nodeUrl: string): string {
  const url = new URL(nodeUrl);
  const scheme = url.protocol.replace(':', '');
  if (scheme !== 'http' && scheme !== 'https') {
    throw new Error('Node URL must use http or https');
  }
  return `${CLUSTER_NODE_PROXY_PREFIX}/${scheme}/${url.host}/api`;
}

async function nodePostForm<T>(
  base: string,
  endpoint: string,
  params: Record<string, string>,
  token: string | undefined,
  timeoutMs: number
): Promise<ApiResponse<T> & { token?: string }> {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) body.append(key, value);
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body.toString(),
    });
    return (await response.json()) as ApiResponse<T> & { token?: string };
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface NodeAuthResult {
  status: string;
  token?: string;
  errorMessage?: string;
}

// Step 1 of enrolling a remote node: sign in to it through the cluster-node
// proxy to obtain a token scoped to that node. Returns status '2fa-required'
// when the node's admin has TOTP enabled (same as the login flow), so the caller
// can prompt for a code and retry. The token never touches the shared (primary)
// session token.
export async function authenticateNode(
  nodeUrl: string,
  username: string,
  password: string,
  totp?: string
): Promise<NodeAuthResult> {
  let base: string;
  try {
    base = nodeApiBase(nodeUrl);
  } catch (error) {
    return {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Invalid node URL',
    };
  }

  try {
    const login = await nodePostForm<unknown>(
      base,
      '/user/login',
      { user: username, pass: password, ...(totp ? { totp } : {}) },
      undefined,
      30000
    );
    return {
      status: login.status,
      token: login.token,
      errorMessage: login.errorMessage,
    };
  } catch (error) {
    return {
      status: 'error',
      errorMessage:
        error instanceof Error
          ? `Could not reach ${nodeUrl}: ${error.message}`
          : `Could not reach ${nodeUrl}`,
    };
  }
}

// Step 2: tell an already-authenticated node to join this cluster as a Secondary.
// Uses the token from authenticateNode(). This can take a while while the new
// node pulls the initial configuration from the primary.
export async function joinNodeToCluster(
  params: JoinNodeParams
): Promise<ApiResponse<ClusterState>> {
  let base: string;
  try {
    base = nodeApiBase(params.nodeUrl);
  } catch (error) {
    return {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : 'Invalid node URL',
    };
  }

  try {
    return await nodePostForm<ClusterState>(
      base,
      '/admin/cluster/initJoin',
      {
        secondaryNodeIpAddresses: params.secondaryNodeIpAddresses,
        primaryNodeUrl: params.primaryNodeUrl,
        primaryNodeIpAddress: params.primaryNodeIpAddress ?? '',
        primaryNodeUsername: params.primaryNodeUsername,
        primaryNodePassword: params.primaryNodePassword,
        primaryNodeTotp: params.primaryNodeTotp ?? '',
        ignoreCertificateErrors: params.ignoreCertificateErrors ? 'true' : '',
      },
      params.nodeToken,
      180000
    );
  } catch (error) {
    return {
      status: 'error',
      errorMessage:
        error instanceof Error
          ? `Join request failed: ${error.message}`
          : 'Join request failed',
    };
  }
}
