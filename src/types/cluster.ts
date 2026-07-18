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

// Enrolling a remote node as a Secondary from the Primary's UI is a two-step
// flow (Technitium requires the join to be initiated ON the joining node): first
// authenticate to the new node through the cluster-node proxy, then tell it to
// join using the token from that sign-in.
export interface JoinNodeParams {
  // The new node's current web service URL, e.g. "http://ns2.example.com:5380".
  nodeUrl: string;
  // Token obtained from authenticateNode() — scoped to the new node.
  nodeToken: string;
  // IPs the new node advertises to the rest of the cluster.
  secondaryNodeIpAddresses: string;
  // Primary (this node) details passed to the new node's initJoin call.
  primaryNodeUrl: string;
  primaryNodeIpAddress?: string;
  primaryNodeUsername: string;
  primaryNodePassword: string;
  primaryNodeTotp?: string;
  ignoreCertificateErrors?: boolean;
}
