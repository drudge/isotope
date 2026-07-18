import { useCallback, useMemo, useState } from 'react';
import {
  Network,
  Server,
  Crown,
  Activity,
  RefreshCw,
  Plus,
  Link,
  Settings2,
  Globe,
  Trash2,
  LogOut,
  ArrowUp,
  MoreVertical,
  ServerCog,
  ChevronDown,
  Check,
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
import { cn } from '@/lib/utils';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/api/auth';
import { toast } from 'sonner';
import {
  getClusterState,
  initializeCluster,
  joinCluster,
  authenticateNode,
  joinNodeToCluster,
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
  const styles: Record<NodeType, string> = {
    Primary: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    Secondary: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    Unknown: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  );
}

// Node state badge component
function NodeStateBadge({ state }: { state: NodeState }) {
  const styles: Record<NodeState, string> = {
    Self: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    Connected: 'bg-green-500/10 text-green-600 dark:text-green-400',
    Unreachable: 'bg-red-500/10 text-red-600 dark:text-red-400',
    Unknown: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[state]}`}>
      {state}
    </span>
  );
}

// A single cluster node rendered as a responsive card
function NodeCard({
  node,
  canManage,
  onRemove,
}: {
  node: ClusterNode;
  canManage: boolean;
  onRemove: (node: ClusterNode) => void;
}) {
  const isSelf = node.state === 'Self';
  const isPrimaryNode = node.type === 'Primary';
  const showMenu = canManage && node.type === 'Secondary';

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isSelf ? 'border-primary/30 bg-muted/40' : 'bg-card hover:bg-muted/30'
      )}
    >
      {/* Header: identity + badges (stacks on mobile so the name is never clipped) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
              isPrimaryNode
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
            )}
          >
            {isPrimaryNode ? <Crown className="h-4 w-4" /> : <Server className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium" title={node.name}>
                {node.name}
              </span>
              {isSelf && <span className="shrink-0 text-xs text-muted-foreground">(this node)</span>}
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground" title={node.url}>
              {node.url}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0 sm:pt-0.5">
          <NodeTypeBadge type={node.type} />
          <NodeStateBadge state={node.state} />
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemove(node)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Node
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Meta: IPs, up since, last seen */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-4">
        <div className="col-span-2">
          <div className="mb-1 text-xs text-muted-foreground">IP Addresses</div>
          {node.ipAddresses && node.ipAddresses.length > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-1">
              {node.ipAddresses.map((ip) => (
                <span
                  key={ip}
                  className="max-w-full break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                >
                  {ip}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Up Since</div>
          <div className="text-sm">{formatDateTime(node.upSince)}</div>
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Last Seen</div>
          <div className="text-sm">{isSelf ? 'Now' : formatDateTime(node.lastSeen)}</div>
        </div>
      </div>
    </div>
  );
}

export default function Cluster() {
  useDocumentTitle('Cluster');
  const { user } = useAuth();

  // Data fetching
  const { data: clusterData, isLoading, refetch } = useApi(
    () => getClusterState(true),
    []
  );

  // Dialog states
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
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

  // Form states - Add Node (enroll a remote node as a secondary from here)
  const [addNodeUrl, setAddNodeUrl] = useState('');
  const [addNodeUsername, setAddNodeUsername] = useState('');
  const [addNodePassword, setAddNodePassword] = useState('');
  const [addNodeTotp, setAddNodeTotp] = useState('');
  const [addNodeSecondaryIps, setAddNodeSecondaryIps] = useState('');
  const [addPrimaryUrl, setAddPrimaryUrl] = useState('');
  const [addPrimaryIp, setAddPrimaryIp] = useState('');
  const [addPrimaryUsername, setAddPrimaryUsername] = useState('');
  const [addPrimaryPassword, setAddPrimaryPassword] = useState('');
  const [addPrimaryTotp, setAddPrimaryTotp] = useState('');
  const [addIgnoreCert, setAddIgnoreCert] = useState(false);
  const [addAdvancedOpen, setAddAdvancedOpen] = useState(false);
  const [addNodeLoading, setAddNodeLoading] = useState(false);
  // Add Node wizard: step 1 verifies the new node, step 2 confirms on this primary.
  const [addNodeStep, setAddNodeStep] = useState<1 | 2>(1);
  const [addNodeToken, setAddNodeToken] = useState('');
  const [addNodeStepLoading, setAddNodeStepLoading] = useState(false);
  const [addNodeNeeds2fa, setAddNodeNeeds2fa] = useState(false);
  const [addPrimaryNeeds2fa, setAddPrimaryNeeds2fa] = useState(false);

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
  const nodes = useMemo(() => clusterState?.clusterNodes ?? [], [clusterState?.clusterNodes]);
  const selfNode = useMemo(() => nodes.find((n) => n.state === 'Self'), [nodes]);
  const isPrimary = selfNode?.type === 'Primary';
  const isSecondary = selfNode?.type === 'Secondary';
  // Name of this (primary) node, for labelling the Add Node wizard — Isotope can
  // point at any server, so "this primary" alone is ambiguous.
  const primaryLabel = useMemo(() => {
    if (selfNode?.name) return selfNode.name;
    if (selfNode?.url) {
      try {
        return new URL(selfNode.url).host;
      } catch {
        // fall through to the generic label
      }
    }
    return 'this primary';
  }, [selfNode]);
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

  const resetAddNodeForm = useCallback(() => {
    setAddNodeUrl('');
    setAddNodeUsername('');
    setAddNodePassword('');
    setAddNodeTotp('');
    setAddNodeSecondaryIps('');
    setAddPrimaryUrl('');
    setAddPrimaryIp('');
    setAddPrimaryUsername('');
    setAddPrimaryPassword('');
    setAddPrimaryTotp('');
    setAddIgnoreCert(false);
    setAddAdvancedOpen(false);
    setAddNodeStep(1);
    setAddNodeToken('');
    setAddNodeNeeds2fa(false);
    setAddPrimaryNeeds2fa(false);
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

  // Open the Add Node dialog, pre-filling this primary node's own details so the
  // new node knows where to sync from.
  const openAddNodeDialog = useCallback(() => {
    // The primary URL and admin username are derived from this node / session,
    // so only the primary password (and a 2FA code, if enabled) is needed.
    if (selfNode?.url) setAddPrimaryUrl(selfNode.url);
    if (user?.username) setAddPrimaryUsername(user.username);
    setAddNodeStep(1);
    setAddNodeToken('');
    setAddNodeNeeds2fa(false);
    setAddPrimaryNeeds2fa(false);
    setAddAdvancedOpen(false);
    setAddNodeDialogOpen(true);
    // Detect whether this admin has 2FA so we can ask for the code up front on
    // the confirm step instead of failing the join.
    getUserProfile()
      .then((res) => {
        if (res.status === 'ok') {
          setAddPrimaryNeeds2fa(!!res.response?.totpEnabled);
        }
      })
      .catch(() => {});
  }, [selfNode, user]);

  // Step 1: verify the new node by signing in to it. On success we hold a token
  // scoped to that node and advance to the confirm step; if it has 2FA we reveal
  // a code field and let the user retry (mirrors the login flow).
  const handleVerifyNode = useCallback(async () => {
    if (!addNodeUrl.trim()) {
      toast.error('New node URL is required');
      return;
    }
    if (!addNodeUsername.trim() || !addNodePassword) {
      toast.error('New node admin credentials are required');
      return;
    }
    if (!addNodeSecondaryIps.trim()) {
      toast.error('New node IP addresses are required');
      return;
    }
    if (addNodeNeeds2fa && !addNodeTotp.trim()) {
      toast.error('Enter the new node authenticator code');
      return;
    }

    setAddNodeStepLoading(true);
    try {
      const result = await authenticateNode(
        addNodeUrl.trim(),
        addNodeUsername.trim(),
        addNodePassword,
        addNodeTotp.trim() || undefined
      );

      if (result.status === 'ok' && result.token) {
        setAddNodeToken(result.token);
        setAddNodeStep(2);
      } else if (result.status === '2fa-required') {
        setAddNodeNeeds2fa(true);
        toast.error(
          addNodeTotp
            ? result.errorMessage || 'Invalid authenticator code'
            : 'This node has 2FA enabled — enter its authenticator code'
        );
      } else {
        toast.error(result.errorMessage || 'Could not sign in to the new node');
      }
    } catch (error) {
      console.error('Failed to verify node:', error);
      toast.error('Failed to reach the new node');
    } finally {
      setAddNodeStepLoading(false);
    }
  }, [
    addNodeUrl,
    addNodeUsername,
    addNodePassword,
    addNodeTotp,
    addNodeSecondaryIps,
    addNodeNeeds2fa,
  ]);

  // Step 2: tell the verified node to join, authorized by the primary password
  // (and 2FA code if this admin has it enabled).
  const handleAddNode = useCallback(async () => {
    if (!addNodeToken) {
      setAddNodeStep(1);
      toast.error('Verify the new node first');
      return;
    }
    if (!addPrimaryUrl.trim()) {
      toast.error('Primary node URL is required');
      return;
    }
    if (!addPrimaryPassword) {
      toast.error('Your primary password is required');
      return;
    }
    if (addPrimaryNeeds2fa && !addPrimaryTotp.trim()) {
      toast.error('Enter your authenticator code');
      return;
    }

    setAddNodeLoading(true);
    try {
      const response = await joinNodeToCluster({
        nodeUrl: addNodeUrl.trim(),
        nodeToken: addNodeToken,
        secondaryNodeIpAddresses: addNodeSecondaryIps
          .split('\n')
          .filter(Boolean)
          .join(','),
        primaryNodeUrl: addPrimaryUrl.trim(),
        primaryNodeIpAddress: addPrimaryIp.trim() || undefined,
        primaryNodeUsername: addPrimaryUsername.trim(),
        primaryNodePassword: addPrimaryPassword,
        primaryNodeTotp: addPrimaryTotp.trim() || undefined,
        ignoreCertificateErrors: addIgnoreCert,
      });

      if (response.status === 'ok') {
        toast.success('Node enrolled as a secondary');
        setAddNodeDialogOpen(false);
        resetAddNodeForm();
        refetch();
      } else {
        const message = response.errorMessage || 'Failed to add node';
        // Reveal the 2FA field if the primary needed a code we didn't ask for.
        if (!addPrimaryNeeds2fa && /2fa|totp|two.?factor|authenticator/i.test(message)) {
          setAddPrimaryNeeds2fa(true);
        }
        toast.error(message);
      }
    } catch (error) {
      console.error('Failed to add node:', error);
      toast.error('Failed to add node');
    } finally {
      setAddNodeLoading(false);
    }
  }, [
    addNodeToken,
    addNodeUrl,
    addNodeSecondaryIps,
    addPrimaryUrl,
    addPrimaryIp,
    addPrimaryUsername,
    addPrimaryPassword,
    addPrimaryTotp,
    addPrimaryNeeds2fa,
    addIgnoreCert,
    resetAddNodeForm,
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
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button onClick={() => setInitDialogOpen(true)} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Initialize New Cluster
                    </Button>
                    <Button variant="outline" onClick={() => setJoinDialogOpen(true)} className="w-full sm:w-auto">
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
                          Total Nodes
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
                          <ServerCog className="h-4 w-4 mr-2" />
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

          {/* Nodes List (only when initialized) */}
          {isInitialized && !isLoading && nodes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg">Cluster Nodes</CardTitle>
                    <CardDescription>
                      {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} in this cluster
                    </CardDescription>
                  </div>
                  {isPrimary && (
                    <Button size="sm" className="shrink-0" onClick={openAddNodeDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Node
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {nodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    canManage={isPrimary}
                    onRemove={setRemoveNodeOpen}
                  />
                ))}
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
          {isInitialized && isSecondary && selfNode?.configLastSynced && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sync Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Synced</span>
                  <span className="font-medium">{formatDateTime(selfNode.configLastSynced)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Config Refresh</span>
                  <span className="font-medium">
                    {Math.floor((clusterState?.configRefreshIntervalSeconds ?? 900) / 60)} min
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

      {/* Add Node wizard: step 1 verifies the new node, step 2 confirms here */}
      <Dialog
        open={addNodeDialogOpen}
        onOpenChange={(open) => {
          if (!addNodeLoading && !addNodeStepLoading) {
            setAddNodeDialogOpen(open);
            if (!open) resetAddNodeForm();
          }
        }}
      >
        <DialogContent
          className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>Add Node to Cluster</DialogTitle>
            <DialogDescription>
              {addNodeStep === 1
                ? 'Connect to the DNS server you want to enroll as a secondary.'
                : `Confirm with your credentials on ${primaryLabel} to authorize the join.`}
            </DialogDescription>

            {/* Two-step progress indicator */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {addNodeStep > 1 ? <Check className="h-3.5 w-3.5" /> : '1'}
                </span>
                <span
                  className={cn(
                    'text-sm',
                    addNodeStep === 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  Enroll new node
                </span>
              </div>
              <div
                className={cn(
                  'h-px w-10 transition-colors',
                  addNodeStep > 1 ? 'bg-primary' : 'bg-border'
                )}
              />
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    addNodeStep === 2
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  2
                </span>
                <span
                  className={cn(
                    'text-sm',
                    addNodeStep === 2 ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  Confirm
                </span>
              </div>
            </div>
          </DialogHeader>

          {addNodeStep === 1 ? (
            <>
              {/* Caution about the new node being overwritten, pinned + visible */}
              <div className="mt-1 flex shrink-0 gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  Joining overwrites the new node's Allowed, Blocked, Apps, Settings, and
                  Administration.
                </p>
              </div>

              <div className="-mr-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="addNodeUrl">New Node URL</Label>
                  <Input
                    id="addNodeUrl"
                    placeholder="http://ns2.example.com:5380"
                    value={addNodeUrl}
                    onChange={(e) => setAddNodeUrl(e.target.value)}
                    disabled={addNodeStepLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    The new node's web console URL. Its host must be covered by the server's{' '}
                    <code className="font-mono">CLUSTER_NODE_ALLOWED_DOMAINS</code>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addNodeUsername">New Node Admin</Label>
                    <Input
                      id="addNodeUsername"
                      placeholder="Username"
                      autoComplete="off"
                      value={addNodeUsername}
                      onChange={(e) => setAddNodeUsername(e.target.value)}
                      disabled={addNodeStepLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addNodePassword">Password</Label>
                    <Input
                      id="addNodePassword"
                      type="password"
                      autoComplete="new-password"
                      value={addNodePassword}
                      onChange={(e) => setAddNodePassword(e.target.value)}
                      disabled={addNodeStepLoading}
                    />
                  </div>
                </div>

                {addNodeNeeds2fa && (
                  <div className="space-y-2">
                    <Label htmlFor="addNodeTotp">New Node Authenticator Code</Label>
                    <Input
                      id="addNodeTotp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      maxLength={6}
                      value={addNodeTotp}
                      onChange={(e) => setAddNodeTotp(e.target.value.replace(/\D/g, ''))}
                      disabled={addNodeStepLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      This node has two-factor authentication enabled.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="addNodeIps">New Node IP Addresses</Label>
                  <Textarea
                    id="addNodeIps"
                    placeholder="Enter IP addresses (one per line)"
                    value={addNodeSecondaryIps}
                    onChange={(e) => setAddNodeSecondaryIps(e.target.value)}
                    rows={2}
                    disabled={addNodeStepLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    IP addresses of the new node that other cluster nodes can reach.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="-mr-2 min-h-0 flex-1 space-y-4 overflow-y-auto pr-2 pt-1">
              {/* Summary of what will happen */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-100">
                <span className="font-semibold">
                  {(() => {
                    try {
                      return new URL(addNodeUrl).host;
                    } catch {
                      return 'The new node';
                    }
                  })()}
                </span>{' '}
                will join{' '}
                <span className="font-semibold">
                  {clusterState?.clusterDomain || 'this cluster'}
                </span>{' '}
                as a secondary and sync its configuration from{' '}
                <span className="font-semibold">
                  {addPrimaryUsername || user?.username || 'the current admin'}
                </span>{' '}
                on{' '}
                <span className="font-semibold">{primaryLabel}</span>.
              </div>

              <div className="space-y-2">
                <Label htmlFor="addPrimaryPassword">Your password on {primaryLabel}</Label>
                <Input
                  id="addPrimaryPassword"
                  type="password"
                  autoComplete="new-password"
                  value={addPrimaryPassword}
                  onChange={(e) => setAddPrimaryPassword(e.target.value)}
                  disabled={addNodeLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Used once to authorize the new node's config sync. Not stored.
                </p>
              </div>

              {addPrimaryNeeds2fa && (
                <div className="space-y-2">
                  <Label htmlFor="addPrimaryTotp">Your Authenticator Code</Label>
                  <Input
                    id="addPrimaryTotp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    value={addPrimaryTotp}
                    onChange={(e) => setAddPrimaryTotp(e.target.value.replace(/\D/g, ''))}
                    disabled={addNodeLoading}
                  />
                </div>
              )}

              {/* Advanced: rarely-needed overrides */}
              <Collapsible open={addAdvancedOpen} onOpenChange={setAddAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    disabled={addNodeLoading}
                  >
                    <Settings2 className="h-4 w-4" />
                    Advanced Options
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        addAdvancedOpen && 'rotate-180'
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="addPrimaryUrl">Primary Node URL</Label>
                    <Input
                      id="addPrimaryUrl"
                      placeholder="https://primary.example.com:53443/"
                      value={addPrimaryUrl}
                      onChange={(e) => setAddPrimaryUrl(e.target.value)}
                      disabled={addNodeLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      HTTPS URL the new node connects to for config sync. Defaults to this node.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="addPrimaryUsername">Primary Admin Username</Label>
                      <Input
                        id="addPrimaryUsername"
                        autoComplete="off"
                        value={addPrimaryUsername}
                        onChange={(e) => setAddPrimaryUsername(e.target.value)}
                        disabled={addNodeLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="addPrimaryIp">Primary Node IP (Optional)</Label>
                      <Input
                        id="addPrimaryIp"
                        placeholder="192.168.1.1"
                        value={addPrimaryIp}
                        onChange={(e) => setAddPrimaryIp(e.target.value)}
                        disabled={addNodeLoading}
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="addIgnoreCert"
                      checked={addIgnoreCert}
                      onCheckedChange={(checked) => setAddIgnoreCert(checked as boolean)}
                      disabled={addNodeLoading}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="addIgnoreCert" className="cursor-pointer text-sm">
                        Ignore Certificate Validation Errors
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Use only for a self-signed certificate on this primary over a trusted
                        network.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {addNodeLoading && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2">
                    <IsotopeSpinner size="sm" className="text-blue-600" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Enrolling node...</strong>
                      <p className="mt-1 text-xs">
                        This may take a while while the new node syncs configuration from the
                        primary.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="shrink-0">
            {addNodeStep === 1 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAddNodeDialogOpen(false)}
                  disabled={addNodeStepLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleVerifyNode} disabled={addNodeStepLoading}>
                  {addNodeStepLoading ? (
                    <>
                      <IsotopeSpinner size="sm" className="mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAddNodeStep(1)}
                  disabled={addNodeLoading}
                >
                  Back
                </Button>
                <Button onClick={handleAddNode} disabled={addNodeLoading}>
                  {addNodeLoading ? (
                    <>
                      <IsotopeSpinner size="sm" className="mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add Node'
                  )}
                </Button>
              </>
            )}
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
