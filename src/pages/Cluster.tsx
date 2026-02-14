import { useCallback, useMemo, useState } from 'react';
import {
  Network,
  Server,
  Crown,
  Activity,
  RefreshCw,
  Plus,
  Link,
  Settings,
  Globe,
  Trash2,
  LogOut,
  ArrowUp,
  MoreVertical,

  AlertTriangle,
} from 'lucide-react';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  getClusterState,
  initializeCluster,
  joinCluster,
  deleteCluster,
  removeSecondary,
  deleteSecondary,
  setClusterOptions,
  leaveCluster,
  resyncCluster,
  promoteToPrimary,
  updatePrimaryNode,
  updateNodeIpAddresses,
} from '@/api/cluster';
import type { ClusterState, ClusterNode, NodeType, NodeState } from '@/types/cluster';

// Helper to format datetime
function formatDateTime(dateStr?: string): string {
  if (!dateStr || dateStr === '0001-01-01T00:00:00') return '-';
  return new Date(dateStr).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Node type badge component
function NodeTypeBadge({ type }: { type: NodeType }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        type === 'Primary'
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
      }`}
    >
      {type}
    </span>
  );
}

// Node state badge component
function NodeStateBadge({ state }: { state: NodeState }) {
  const styles: Record<NodeState, string> = {
    Self: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    Connected: 'bg-green-500/10 text-green-600 dark:text-green-400',
    Disconnected: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    Unreachable: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[state]}`}>
      {state}
    </span>
  );
}

export default function Cluster() {
  useDocumentTitle('Cluster');

  // Data fetching
  const { data: clusterData, isLoading, refetch } = useApi(
    () => getClusterState(true),
    []
  );

  // Dialog states
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [updateIpDialogOpen, setUpdateIpDialogOpen] = useState(false);
  const [updatePrimaryDialogOpen, setUpdatePrimaryDialogOpen] = useState(false);
  const [deleteClusterOpen, setDeleteClusterOpen] = useState(false);
  const [leaveClusterOpen, setLeaveClusterOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [removeNodeOpen, setRemoveNodeOpen] = useState<ClusterNode | null>(null);

  // Form states - Initialize
  const [initClusterDomain, setInitClusterDomain] = useState('');
  const [initPrimaryIps, setInitPrimaryIps] = useState('');
  const [initLoading, setInitLoading] = useState(false);

  // Form states - Join
  const [joinSecondaryIps, setJoinSecondaryIps] = useState('');
  const [joinPrimaryUrl, setJoinPrimaryUrl] = useState('');
  const [joinPrimaryIp, setJoinPrimaryIp] = useState('');
  const [joinUsername, setJoinUsername] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinTotp, setJoinTotp] = useState('');
  const [joinIgnoreCert, setJoinIgnoreCert] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // Form states - Options
  const [optHeartbeatRefresh, setOptHeartbeatRefresh] = useState(30);
  const [optHeartbeatRetry, setOptHeartbeatRetry] = useState(10);
  const [optConfigRefresh, setOptConfigRefresh] = useState(900);
  const [optConfigRetry, setOptConfigRetry] = useState(60);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Form states - Update IP
  const [updateIps, setUpdateIps] = useState('');
  const [updateIpLoading, setUpdateIpLoading] = useState(false);

  // Form states - Update Primary
  const [updatePrimaryUrl, setUpdatePrimaryUrl] = useState('');
  const [updatePrimaryIps, setUpdatePrimaryIps] = useState('');
  const [updatePrimaryLoading, setUpdatePrimaryLoading] = useState(false);

  // Force options for destructive actions
  const [forceDelete, setForceDelete] = useState(false);
  const [forceLeave, setForceLeave] = useState(false);
  const [forcePromote, setForcePromote] = useState(false);
  const [forceRemove, setForceRemove] = useState(false);

  // Action loading states
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [resyncLoading, setResyncLoading] = useState(false);

  // Derived state
  const clusterState = clusterData as ClusterState | null;
  const isInitialized = clusterState?.clusterInitialized ?? false;
  const nodes = useMemo(() => clusterState?.nodes ?? [], [clusterState?.nodes]);
  const selfNode = useMemo(() => nodes.find((n) => n.state === 'Self'), [nodes]);
  const isPrimary = selfNode?.type === 'Primary';
  const isSecondary = selfNode?.type === 'Secondary';
  const serverIpAddresses = useMemo(
    () => clusterState?.serverIpAddresses ?? [],
    [clusterState?.serverIpAddresses]
  );
  const connectedCount = useMemo(
    () => nodes.filter((n) => n.state === 'Connected' || n.state === 'Self').length,
    [nodes]
  );

  // Reset form states
  const resetInitForm = useCallback(() => {
    setInitClusterDomain('');
    setInitPrimaryIps('');
  }, []);

  const resetJoinForm = useCallback(() => {
    setJoinSecondaryIps('');
    setJoinPrimaryUrl('');
    setJoinPrimaryIp('');
    setJoinUsername('');
    setJoinPassword('');
    setJoinTotp('');
    setJoinIgnoreCert(false);
  }, []);

  // Quick add IPs handler
  const handleQuickAddIps = useCallback(
    (setter: (ips: string) => void) => {
      if (serverIpAddresses.length > 0) {
        setter(serverIpAddresses.join('\n'));
      } else {
        toast.error('No server IP addresses available');
      }
    },
    [serverIpAddresses]
  );

  // Initialize cluster handler
  const handleInitialize = useCallback(async () => {
    if (!initClusterDomain.trim()) {
      toast.error('Cluster domain is required');
      return;
    }
    if (!initPrimaryIps.trim()) {
      toast.error('Primary node IP addresses are required');
      return;
    }

    setInitLoading(true);
    try {
      const response = await initializeCluster({
        clusterDomain: initClusterDomain.trim(),
        primaryNodeIpAddresses: initPrimaryIps.split('\n').filter(Boolean).join(','),
      });

      if (response.status === 'ok') {
        toast.success('Cluster initialized successfully');
        setInitDialogOpen(false);
        resetInitForm();
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to initialize cluster');
      }
    } catch (error) {
      console.error('Failed to initialize cluster:', error);
      toast.error('Failed to initialize cluster');
    } finally {
      setInitLoading(false);
    }
  }, [initClusterDomain, initPrimaryIps, resetInitForm, refetch]);

  // Join cluster handler
  const handleJoin = useCallback(async () => {
    if (!joinSecondaryIps.trim()) {
      toast.error('Secondary node IP addresses are required');
      return;
    }
    if (!joinPrimaryUrl.trim()) {
      toast.error('Primary node URL is required');
      return;
    }
    if (!joinUsername.trim()) {
      toast.error('Primary admin username is required');
      return;
    }
    if (!joinPassword) {
      toast.error('Primary admin password is required');
      return;
    }

    setJoinLoading(true);
    try {
      const response = await joinCluster({
        secondaryNodeIpAddresses: joinSecondaryIps.split('\n').filter(Boolean).join(','),
        primaryNodeUrl: joinPrimaryUrl.trim(),
        primaryNodeIpAddress: joinPrimaryIp.trim() || undefined,
        ignoreCertificateErrors: joinIgnoreCert,
        primaryNodeUsername: joinUsername.trim(),
        primaryNodePassword: joinPassword,
        primaryNodeTotp: joinTotp.trim() || undefined,
      });

      if (response.status === 'ok') {
        toast.success('Successfully joined the cluster');
        setJoinDialogOpen(false);
        resetJoinForm();
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to join cluster');
      }
    } catch (error) {
      console.error('Failed to join cluster:', error);
      toast.error('Failed to join cluster');
    } finally {
      setJoinLoading(false);
    }
  }, [
    joinSecondaryIps,
    joinPrimaryUrl,
    joinPrimaryIp,
    joinUsername,
    joinPassword,
    joinTotp,
    joinIgnoreCert,
    resetJoinForm,
    refetch,
  ]);

  // Save options handler
  const handleSaveOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const response = await setClusterOptions({
        heartbeatRefreshIntervalSeconds: optHeartbeatRefresh,
        heartbeatRetryIntervalSeconds: optHeartbeatRetry,
        configRefreshIntervalSeconds: optConfigRefresh,
        configRetryIntervalSeconds: optConfigRetry,
      });

      if (response.status === 'ok') {
        toast.success('Cluster options saved');
        setOptionsDialogOpen(false);
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to save options');
      }
    } catch (error) {
      console.error('Failed to save options:', error);
      toast.error('Failed to save options');
    } finally {
      setOptionsLoading(false);
    }
  }, [optHeartbeatRefresh, optHeartbeatRetry, optConfigRefresh, optConfigRetry, refetch]);

  // Update IP addresses handler
  const handleUpdateIp = useCallback(async () => {
    if (!updateIps.trim()) {
      toast.error('IP addresses are required');
      return;
    }

    setUpdateIpLoading(true);
    try {
      const response = await updateNodeIpAddresses(
        updateIps.split('\n').filter(Boolean).join(',')
      );

      if (response.status === 'ok') {
        toast.success('IP addresses updated');
        setUpdateIpDialogOpen(false);
        setUpdateIps('');
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to update IP addresses');
      }
    } catch (error) {
      console.error('Failed to update IP addresses:', error);
      toast.error('Failed to update IP addresses');
    } finally {
      setUpdateIpLoading(false);
    }
  }, [updateIps, refetch]);

  // Update primary node handler
  const handleUpdatePrimary = useCallback(async () => {
    if (!updatePrimaryUrl.trim()) {
      toast.error('Primary node URL is required');
      return;
    }

    setUpdatePrimaryLoading(true);
    try {
      const response = await updatePrimaryNode({
        primaryNodeUrl: updatePrimaryUrl.trim(),
        primaryNodeIpAddresses: updatePrimaryIps.trim() || undefined,
      });

      if (response.status === 'ok') {
        toast.success('Primary node updated');
        setUpdatePrimaryDialogOpen(false);
        setUpdatePrimaryUrl('');
        setUpdatePrimaryIps('');
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to update primary node');
      }
    } catch (error) {
      console.error('Failed to update primary node:', error);
      toast.error('Failed to update primary node');
    } finally {
      setUpdatePrimaryLoading(false);
    }
  }, [updatePrimaryUrl, updatePrimaryIps, refetch]);

  // Delete cluster handler
  const handleDeleteCluster = useCallback(async () => {
    setDeleteLoading(true);
    try {
      const response = await deleteCluster(forceDelete);

      if (response.status === 'ok') {
        toast.success('Cluster deleted');
        setDeleteClusterOpen(false);
        setForceDelete(false);
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to delete cluster');
      }
    } catch (error) {
      console.error('Failed to delete cluster:', error);
      toast.error('Failed to delete cluster');
    } finally {
      setDeleteLoading(false);
    }
  }, [forceDelete, refetch]);

  // Leave cluster handler
  const handleLeaveCluster = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const response = await leaveCluster(forceLeave);

      if (response.status === 'ok') {
        toast.success('Left the cluster');
        setLeaveClusterOpen(false);
        setForceLeave(false);
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to leave cluster');
      }
    } catch (error) {
      console.error('Failed to leave cluster:', error);
      toast.error('Failed to leave cluster');
    } finally {
      setLeaveLoading(false);
    }
  }, [forceLeave, refetch]);

  // Promote to primary handler
  const handlePromote = useCallback(async () => {
    setPromoteLoading(true);
    try {
      const response = await promoteToPrimary(forcePromote);

      if (response.status === 'ok') {
        toast.success('Promoted to primary node');
        setPromoteOpen(false);
        setForcePromote(false);
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to promote to primary');
      }
    } catch (error) {
      console.error('Failed to promote to primary:', error);
      toast.error('Failed to promote to primary');
    } finally {
      setPromoteLoading(false);
    }
  }, [forcePromote, refetch]);

  // Remove secondary handler
  const handleRemoveNode = useCallback(async () => {
    if (!removeNodeOpen) return;

    setRemoveLoading(true);
    try {
      const response = forceRemove
        ? await deleteSecondary(removeNodeOpen.id)
        : await removeSecondary(removeNodeOpen.id);

      if (response.status === 'ok') {
        toast.success(`Node "${removeNodeOpen.name}" removed`);
        setRemoveNodeOpen(null);
        setForceRemove(false);
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to remove node');
      }
    } catch (error) {
      console.error('Failed to remove node:', error);
      toast.error('Failed to remove node');
    } finally {
      setRemoveLoading(false);
    }
  }, [removeNodeOpen, forceRemove, refetch]);

  // Resync handler
  const handleResync = useCallback(async () => {
    setResyncLoading(true);
    try {
      const response = await resyncCluster();

      if (response.status === 'ok') {
        toast.success('Configuration resync started');
        refetch();
      } else {
        toast.error(response.errorMessage || 'Failed to resync');
      }
    } catch (error) {
      console.error('Failed to resync:', error);
      toast.error('Failed to resync');
    } finally {
      setResyncLoading(false);
    }
  }, [refetch]);

  // Open options dialog with current values
  const openOptionsDialog = useCallback(() => {
    setOptHeartbeatRefresh(clusterState?.heartbeatRefreshIntervalSeconds ?? 30);
    setOptHeartbeatRetry(clusterState?.heartbeatRetryIntervalSeconds ?? 10);
    setOptConfigRefresh(clusterState?.configRefreshIntervalSeconds ?? 900);
    setOptConfigRetry(clusterState?.configRetryIntervalSeconds ?? 60);
    setOptionsDialogOpen(true);
  }, [clusterState]);

  // Open update IP dialog with current IPs
  const openUpdateIpDialog = useCallback(() => {
    if (selfNode?.ipAddresses) {
      setUpdateIps(selfNode.ipAddresses.join('\n'));
    }
    setUpdateIpDialogOpen(true);
  }, [selfNode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cluster</h1>
        <p className="text-muted-foreground mt-1">
          Manage DNS server clustering for high availability
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Network
                      className={`h-6 w-6 ${
                        isInitialized ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                      }`}
                    />
                    Cluster Status
                  </CardTitle>
                  <CardDescription>
                    {isInitialized
                      ? `Connected to cluster: ${clusterState?.clusterDomain}`
                      : 'Cluster is not initialized. Create a new cluster or join an existing one.'}
                  </CardDescription>
                </div>
                {isInitialized && (
                  <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                </div>
              ) : !isInitialized ? (
                /* Not Initialized State */
                <div className="py-12 text-center">
                  <Server className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cluster Configured</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Set up clustering to enable high availability and automatic configuration sync
                    across multiple DNS servers.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button onClick={() => setInitDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Initialize New Cluster
                    </Button>
                    <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
                      <Link className="h-4 w-4 mr-2" />
                      Join Existing Cluster
                    </Button>
                  </div>
                </div>
              ) : (
                /* Initialized State */
                <>
                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Node Type */}
                    <div
                      className={`p-4 rounded-lg bg-gradient-to-br ${
                        isPrimary
                          ? 'from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800'
                          : 'from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Crown
                          className={`h-4 w-4 ${
                            isPrimary
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-purple-600 dark:text-purple-400'
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            isPrimary
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-purple-900 dark:text-purple-100'
                          }`}
                        >
                          Node Type
                        </span>
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          isPrimary
                            ? 'text-blue-900 dark:text-blue-50'
                            : 'text-purple-900 dark:text-purple-50'
                        }`}
                      >
                        {isPrimary ? 'Primary' : 'Secondary'}
                      </div>
                    </div>

                    {/* Total Nodes */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Server className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-900 dark:text-green-100">
                          Cluster Nodes
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-50">
                        {nodes.length}
                      </div>
                    </div>

                    {/* Connected Nodes */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-medium text-amber-900 dark:text-amber-100">
                          Connected
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-amber-900 dark:text-amber-50">
                        {connectedCount}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                    {isPrimary && (
                      <>
                        <Button variant="outline" size="sm" onClick={openOptionsDialog}>
                          <Settings className="h-4 w-4 mr-2" />
                          Cluster Options
                        </Button>
                        <Button variant="outline" size="sm" onClick={openUpdateIpDialog}>
                          <Globe className="h-4 w-4 mr-2" />
                          Update IP Addresses
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteClusterOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Cluster
                        </Button>
                      </>
                    )}

                    {isSecondary && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResync}
                          disabled={resyncLoading}
                        >
                          <RefreshCw
                            className={`h-4 w-4 mr-2 ${resyncLoading ? 'animate-spin' : ''}`}
                          />
                          Resync Configuration
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUpdatePrimaryDialogOpen(true)}
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Update Primary
                        </Button>
                        <Button variant="outline" size="sm" onClick={openUpdateIpDialog}>
                          <Globe className="h-4 w-4 mr-2" />
                          Update IP Addresses
                        </Button>
                        <div className="flex-1" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPromoteOpen(true)}
                        >
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Promote to Primary
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setLeaveClusterOpen(true)}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Leave Cluster
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Nodes Table (only when initialized) */}
          {isInitialized && !isLoading && nodes.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Cluster Nodes</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Node</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead>Last Synced</TableHead>
                        {isPrimary && <TableHead className="w-[50px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nodes.map((node) => (
                        <TableRow key={node.id} className="group">
                          <TableCell>
                            <div className="font-medium">{node.name}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                              {node.url}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {node.ipAddresses?.join(', ') || '-'}
                          </TableCell>
                          <TableCell>
                            <NodeTypeBadge type={node.type} />
                          </TableCell>
                          <TableCell>
                            <NodeStateBadge state={node.state} />
                          </TableCell>
                          <TableCell className="text-sm">{formatDateTime(node.lastSeen)}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(node.lastSynced)}</TableCell>
                          {isPrimary && (
                            <TableCell>
                              {node.type === 'Secondary' && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => setRemoveNodeOpen(node)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Remove Node
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Guidance (1/3) */}
        <div className="space-y-6">
          {/* How Clustering Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How Clustering Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Primary Node</p>
                  <p className="text-sm text-muted-foreground">
                    Manages configuration and coordinates all secondary nodes
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Secondary Nodes</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync configuration from the primary node
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">High Availability</p>
                  <p className="text-sm text-muted-foreground">
                    Promote a secondary to primary if the primary fails
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Note */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Note:</strong> Joining a cluster will overwrite configuration for Allowed,
              Blocked, Apps, Settings, and Administration sections.
            </p>
          </div>

          {/* Sync Info (when initialized as secondary) */}
          {isInitialized && isSecondary && clusterState?.configLastSynced && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sync Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Synced</span>
                  <span className="font-medium">{formatDateTime(clusterState.configLastSynced)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Config Refresh</span>
                  <span className="font-medium">
                    {Math.floor((clusterState.configRefreshIntervalSeconds ?? 900) / 60)} min
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Initialize New Cluster Dialog */}
      <Dialog
        open={initDialogOpen}
        onOpenChange={(open) => {
          setInitDialogOpen(open);
          if (!open) resetInitForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Initialize New Cluster</DialogTitle>
            <DialogDescription>
              This will make the current DNS server the Primary node of a new cluster.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clusterDomain">Cluster Domain</Label>
              <Input
                id="clusterDomain"
                placeholder="cluster.example.com"
                value={initClusterDomain}
                onChange={(e) => setInitClusterDomain(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The fully qualified domain name to identify the cluster.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryIps">Primary Node IP Addresses</Label>
              <Textarea
                id="primaryIps"
                placeholder="Enter IP addresses (one per line)"
                value={initPrimaryIps}
                onChange={(e) => setInitPrimaryIps(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAddIps(setInitPrimaryIps)}
                >
                  Quick Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                IP addresses of this server that will be accessible by secondary nodes.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> The DNS Server Domain Name will be changed to a subdomain of
                the cluster domain. For example, if the current domain is{' '}
                <code className="font-mono">ns1.example.com</code> and the cluster domain is{' '}
                <code className="font-mono">cluster.example.com</code>, the new domain will be{' '}
                <code className="font-mono">ns1.cluster.example.com</code>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInitDialogOpen(false)} disabled={initLoading}>
              Cancel
            </Button>
            <Button onClick={handleInitialize} disabled={initLoading}>
              {initLoading ? (
                <>
                  <IsotopeSpinner size="sm" className="mr-2" />
                  Initializing...
                </>
              ) : (
                'Initialize'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Cluster Dialog */}
      <Dialog
        open={joinDialogOpen}
        onOpenChange={(open) => {
          if (!joinLoading) {
            setJoinDialogOpen(open);
            if (!open) resetJoinForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Join Existing Cluster</DialogTitle>
            <DialogDescription>
              Connect this server to an existing cluster as a Secondary node.
            </DialogDescription>
          </DialogHeader>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm text-destructive">
                <strong>Warning:</strong> Joining this cluster will permanently overwrite:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Allowed zones</li>
                  <li>Blocked zones</li>
                  <li>DNS Apps</li>
                  <li>Server Settings</li>
                  <li>Administration (users, groups, permissions)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secondaryIps">Secondary Node IP Addresses</Label>
              <Textarea
                id="secondaryIps"
                placeholder="Enter IP addresses (one per line)"
                value={joinSecondaryIps}
                onChange={(e) => setJoinSecondaryIps(e.target.value)}
                rows={3}
                disabled={joinLoading}
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAddIps(setJoinSecondaryIps)}
                  disabled={joinLoading}
                >
                  Quick Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryUrl">Primary Node URL</Label>
              <Input
                id="primaryUrl"
                placeholder="https://primary.example.com:53443/"
                value={joinPrimaryUrl}
                onChange={(e) => setJoinPrimaryUrl(e.target.value)}
                disabled={joinLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryIp">Primary Node IP Address (Optional)</Label>
              <Input
                id="primaryIp"
                placeholder="192.168.1.1"
                value={joinPrimaryIp}
                onChange={(e) => setJoinPrimaryIp(e.target.value)}
                disabled={joinLoading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to resolve from the Primary URL domain name.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Primary Admin Username</Label>
                <Input
                  id="username"
                  value={joinUsername}
                  onChange={(e) => setJoinUsername(e.target.value)}
                  disabled={joinLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Primary Admin Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  disabled={joinLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totp">2FA Code (Optional)</Label>
              <Input
                id="totp"
                placeholder="123456"
                maxLength={6}
                value={joinTotp}
                onChange={(e) => setJoinTotp(e.target.value)}
                disabled={joinLoading}
              />
              <p className="text-xs text-muted-foreground">
                Only required if 2FA is enabled on the primary admin account.
              </p>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="ignoreCert"
                checked={joinIgnoreCert}
                onCheckedChange={(checked) => setJoinIgnoreCert(checked as boolean)}
                disabled={joinLoading}
              />
              <div className="space-y-1">
                <Label htmlFor="ignoreCert" className="cursor-pointer text-sm">
                  Ignore Certificate Validation Errors
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use only for self-signed certificates on trusted networks. After joining,
                  certificate validation uses DANE-EE via TLSA records.
                </p>
              </div>
            </div>

            {joinLoading && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <IsotopeSpinner size="sm" className="text-blue-600" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Joining Cluster...</strong>
                    <p className="text-xs mt-1">
                      This may take a while depending on the amount of configuration data. HTTPS will
                      be enabled automatically if not already configured.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} disabled={joinLoading}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={joinLoading}>
              {joinLoading ? (
                <>
                  <IsotopeSpinner size="sm" className="mr-2" />
                  Joining...
                </>
              ) : (
                'Join Cluster'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cluster Options Dialog */}
      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cluster Options</DialogTitle>
            <DialogDescription>Configure cluster heartbeat and sync intervals.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heartbeatRefresh">Heartbeat Refresh (seconds)</Label>
                <Input
                  id="heartbeatRefresh"
                  type="number"
                  min={10}
                  max={300}
                  value={optHeartbeatRefresh}
                  onChange={(e) => setOptHeartbeatRefresh(parseInt(e.target.value) || 30)}
                />
                <p className="text-xs text-muted-foreground">10-300 seconds</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartbeatRetry">Heartbeat Retry (seconds)</Label>
                <Input
                  id="heartbeatRetry"
                  type="number"
                  min={10}
                  max={300}
                  value={optHeartbeatRetry}
                  onChange={(e) => setOptHeartbeatRetry(parseInt(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">10-300 seconds</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="configRefresh">Config Refresh (seconds)</Label>
                <Input
                  id="configRefresh"
                  type="number"
                  min={30}
                  max={3600}
                  value={optConfigRefresh}
                  onChange={(e) => setOptConfigRefresh(parseInt(e.target.value) || 900)}
                />
                <p className="text-xs text-muted-foreground">30-3600 seconds</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="configRetry">Config Retry (seconds)</Label>
                <Input
                  id="configRetry"
                  type="number"
                  min={30}
                  max={3600}
                  value={optConfigRetry}
                  onChange={(e) => setOptConfigRetry(parseInt(e.target.value) || 60)}
                />
                <p className="text-xs text-muted-foreground">30-3600 seconds</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionsDialogOpen(false)} disabled={optionsLoading}>
              Cancel
            </Button>
            <Button onClick={handleSaveOptions} disabled={optionsLoading}>
              {optionsLoading ? (
                <>
                  <IsotopeSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Options'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update IP Addresses Dialog */}
      <Dialog open={updateIpDialogOpen} onOpenChange={setUpdateIpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update IP Addresses</DialogTitle>
            <DialogDescription>Update the IP addresses for this node.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="updateIps">Node IP Addresses</Label>
              <Textarea
                id="updateIps"
                placeholder="Enter IP addresses (one per line)"
                value={updateIps}
                onChange={(e) => setUpdateIps(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => handleQuickAddIps(setUpdateIps)}>
                  Quick Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateIpDialogOpen(false)} disabled={updateIpLoading}>
              Cancel
            </Button>
            <Button onClick={handleUpdateIp} disabled={updateIpLoading}>
              {updateIpLoading ? (
                <>
                  <IsotopeSpinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Primary Node Dialog */}
      <Dialog open={updatePrimaryDialogOpen} onOpenChange={setUpdatePrimaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Primary Node</DialogTitle>
            <DialogDescription>
              Update the primary node connection details if they have changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="updatePrimaryUrl">Primary Node URL</Label>
              <Input
                id="updatePrimaryUrl"
                placeholder="https://primary.example.com:53443/"
                value={updatePrimaryUrl}
                onChange={(e) => setUpdatePrimaryUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updatePrimaryIps">Primary Node IP Addresses (Optional)</Label>
              <Input
                id="updatePrimaryIps"
                placeholder="192.168.1.1, 192.168.1.2"
                value={updatePrimaryIps}
                onChange={(e) => setUpdatePrimaryIps(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Leave empty to resolve from URL.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdatePrimaryDialogOpen(false)}
              disabled={updatePrimaryLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdatePrimary} disabled={updatePrimaryLoading}>
              {updatePrimaryLoading ? (
                <>
                  <IsotopeSpinner size="sm" className="mr-2" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cluster Confirmation */}
      <AlertDialog open={deleteClusterOpen} onOpenChange={setDeleteClusterOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cluster?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will remove all cluster configuration from this server. No data will be lost,
                but the cluster will no longer function.
              </p>
              {nodes.length > 1 && (
                <p>
                  There are <strong>{nodes.length - 1} secondary node(s)</strong> in this cluster.
                  They will become orphaned and need to be manually reconfigured.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start space-x-2 py-2">
            <Checkbox
              id="forceDelete"
              checked={forceDelete}
              onCheckedChange={(checked) => setForceDelete(checked as boolean)}
            />
            <Label htmlFor="forceDelete" className="cursor-pointer text-sm">
              Force delete even with secondary nodes present
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCluster}
              disabled={deleteLoading || (nodes.length > 1 && !forceDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Cluster'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Cluster Confirmation */}
      <AlertDialog open={leaveClusterOpen} onOpenChange={setLeaveClusterOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Cluster?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will disconnect this server from the cluster. No data will be lost, but
                configuration will no longer sync with the primary node.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start space-x-2 py-2">
            <Checkbox
              id="forceLeave"
              checked={forceLeave}
              onCheckedChange={(checked) => setForceLeave(checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="forceLeave" className="cursor-pointer text-sm">
                Force leave without notifying primary
              </Label>
              <p className="text-xs text-muted-foreground">
                Use only when the primary node is unreachable or has been decommissioned.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveCluster}
              disabled={leaveLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaveLoading ? 'Leaving...' : 'Leave Cluster'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote to Primary Confirmation */}
      <AlertDialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Primary?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will promote this secondary node to become the new primary node.</p>
              <p>The promotion process will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Resync complete configuration from the current primary</li>
                <li>Delete the current primary node from the cluster</li>
                <li>Upgrade this node to primary</li>
              </ul>
              <p>This may take significant time depending on configuration size.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start space-x-2 py-2">
            <Checkbox
              id="forcePromote"
              checked={forcePromote}
              onCheckedChange={(checked) => setForcePromote(checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="forcePromote" className="cursor-pointer text-sm">
                Force delete current primary without graceful shutdown
              </Label>
              <p className="text-xs text-muted-foreground">
                Use only when the primary node is unreachable or has been decommissioned.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promoteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} disabled={promoteLoading}>
              {promoteLoading ? 'Promoting...' : 'Promote to Primary'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Node Confirmation */}
      <AlertDialog open={!!removeNodeOpen} onOpenChange={() => setRemoveNodeOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Node?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to remove <strong>{removeNodeOpen?.name}</strong> from the
                cluster?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start space-x-2 py-2">
            <Checkbox
              id="forceRemove"
              checked={forceRemove}
              onCheckedChange={(checked) => setForceRemove(checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="forceRemove" className="cursor-pointer text-sm">
                Force delete without graceful removal
              </Label>
              <p className="text-xs text-muted-foreground">
                Use when the node is unreachable. Graceful removal notifies the node to leave.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveNode}
              disabled={removeLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeLoading ? 'Removing...' : 'Remove Node'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
