export type NodeType = 'Primary' | 'Secondary';
export type NodeState = 'Self' | 'Connected' | 'Unreachable' | 'Disconnected';

export interface ClusterNode {
  id: number;
  name: string;
  url: string;
  ipAddresses?: string[];
  type: NodeType;
  state: NodeState;
  lastSeen: string;
  upSince?: string;
  lastSynced?: string;
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
  configLastSynced?: string;
  nodes?: ClusterNode[];
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
