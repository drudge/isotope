export type NodeType = 'Unknown' | 'Primary' | 'Secondary';
export type NodeState = 'Unknown' | 'Self' | 'Connected' | 'Unreachable';

export interface ClusterNode {
  id: number;
  name: string;
  url: string;
  ipAddresses?: string[];
  type: NodeType;
  state: NodeState;
  upSince?: string;
  // Sent only for remote nodes; the Self node has no lastSeen
  lastSeen?: string;
  // Sent only on the Self node when it is a Secondary that has synced
  configLastSynced?: string;
}

export interface ClusterState {
  clusterInitialized: boolean;
  dnsServerDomain: string;
  version: string;
  clusterDomain?: string;
  heartbeatRefreshIntervalSeconds?: number;
  heartbeatRetryIntervalSeconds?: number;
  configRefreshIntervalSeconds?: number;
  configRetryIntervalSeconds?: number;
  clusterNodes?: ClusterNode[];
  serverIpAddresses?: string[];
}

export interface InitClusterParams {
  clusterDomain: string;
  primaryNodeIpAddresses: string;
}

export interface JoinClusterParams {
  secondaryNodeIpAddresses: string;
  primaryNodeUrl: string;
  primaryNodeIpAddress?: string;
  ignoreCertificateErrors?: boolean;
  primaryNodeUsername: string;
  primaryNodePassword: string;
  primaryNodeTotp?: string;
}

export interface ClusterOptionsParams {
  heartbeatRefreshIntervalSeconds?: number;
  heartbeatRetryIntervalSeconds?: number;
  configRefreshIntervalSeconds?: number;
  configRetryIntervalSeconds?: number;
}

export interface UpdatePrimaryParams {
  primaryNodeUrl: string;
  primaryNodeIpAddresses?: string;
}
