import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Power, PowerOff, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  listDhcpScopes,
  listDhcpLeases,
  enableDhcpScope,
  disableDhcpScope,
  deleteDhcpScope,
  removeDhcpLease,
  convertLeaseToReserved,
  convertLeaseToDynamic,
  setDhcpScope,
  type DhcpScope,
  type DhcpLease,
  type SetDhcpScopeParams,
} from '@/api/dhcp';
import { toast } from 'sonner';

export default function Dhcp() {
  const [scopes, setScopes] = useState<DhcpScope[]>([]);
  const [leases, setLeases] = useState<DhcpLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [editingScope, setEditingScope] = useState<DhcpScope | null>(null);
  const [scopeForm, setScopeForm] = useState<SetDhcpScopeParams>({
    name: '',
    startingAddress: '',
    endingAddress: '',
    subnetMask: '',
    leaseTimeDays: '1',
    leaseTimeHours: '0',
    leaseTimeMinutes: '0',
  });

  const fetchScopes = async () => {
    const response = await listDhcpScopes();
    if (response.status === 'ok' && response.response) {
      setScopes(response.response.scopes || []);
    }
  };

  const fetchLeases = async () => {
    const response = await listDhcpLeases();
    if (response.status === 'ok' && response.response) {
      setLeases(response.response.leases || []);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchScopes(), fetchLeases()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleToggleScope = async (scope: DhcpScope) => {
    setProcessing(true);
    const response = scope.enabled
      ? await disableDhcpScope(scope.name)
      : await enableDhcpScope(scope.name);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success(`Scope ${scope.enabled ? 'disabled' : 'enabled'} successfully`);
      await fetchScopes();
    } else {
      toast.error(response.errorMessage || 'Failed to toggle scope');
    }
  };

  const handleDeleteScope = async (name: string) => {
    if (!confirm(`Are you sure you want to delete scope "${name}"?`)) {
      return;
    }

    setProcessing(true);
    const response = await deleteDhcpScope(name);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Scope deleted successfully');
      await fetchScopes();
    } else {
      toast.error(response.errorMessage || 'Failed to delete scope');
    }
  };

  const handleRemoveLease = async (lease: DhcpLease) => {
    if (!confirm(`Are you sure you want to remove lease for ${lease.hardwareAddress}?`)) {
      return;
    }

    setProcessing(true);
    const response = await removeDhcpLease(lease.scope, lease.hardwareAddress);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Lease removed successfully');
      await fetchLeases();
    } else {
      toast.error(response.errorMessage || 'Failed to remove lease');
    }
  };

  const handleConvertToReserved = async (lease: DhcpLease) => {
    setProcessing(true);
    const response = await convertLeaseToReserved(lease.scope, lease.hardwareAddress);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Lease converted to reserved');
      await fetchLeases();
    } else {
      toast.error(response.errorMessage || 'Failed to convert lease');
    }
  };

  const handleConvertToDynamic = async (lease: DhcpLease) => {
    setProcessing(true);
    const response = await convertLeaseToDynamic(lease.scope, lease.hardwareAddress);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success('Lease converted to dynamic');
      await fetchLeases();
    } else {
      toast.error(response.errorMessage || 'Failed to convert lease');
    }
  };

  const handleOpenAddScope = () => {
    setEditingScope(null);
    setScopeForm({
      name: '',
      startingAddress: '',
      endingAddress: '',
      subnetMask: '255.255.255.0',
      leaseTimeDays: '1',
      leaseTimeHours: '0',
      leaseTimeMinutes: '0',
    });
    setShowScopeDialog(true);
  };

  const handleOpenEditScope = (scope: DhcpScope) => {
    setEditingScope(scope);
    setScopeForm({
      name: scope.name,
      startingAddress: scope.startingAddress,
      endingAddress: scope.endingAddress,
      subnetMask: scope.subnetMask,
      leaseTimeDays: String(scope.leaseTimeDays),
      leaseTimeHours: String(scope.leaseTimeHours),
      leaseTimeMinutes: String(scope.leaseTimeMinutes),
    });
    setShowScopeDialog(true);
  };

  const handleSaveScope = async () => {
    if (!scopeForm.name.trim() || !scopeForm.startingAddress.trim() || !scopeForm.endingAddress.trim() || !scopeForm.subnetMask.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    const params: SetDhcpScopeParams = {
      ...scopeForm,
      newName: editingScope && editingScope.name !== scopeForm.name ? scopeForm.name : undefined,
      name: editingScope ? editingScope.name : scopeForm.name,
    };
    const response = await setDhcpScope(params);
    setProcessing(false);

    if (response.status === 'ok') {
      toast.success(`Scope ${editingScope ? 'updated' : 'created'} successfully`);
      await fetchScopes();
      setShowScopeDialog(false);
    } else {
      toast.error(response.errorMessage || `Failed to ${editingScope ? 'update' : 'create'} scope`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DHCP Server</h1>
          <p className="text-muted-foreground mt-1">
            Manage DHCP scopes and leases
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scopes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scopes">Scopes</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
        </TabsList>

        {/* Scopes Tab */}
        <TabsContent value="scopes" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleOpenAddScope}>
              <Plus className="h-4 w-4 mr-2" />
              Add Scope
            </Button>
          </div>

          {scopes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No DHCP scopes configured</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scopes.map((scope) => (
                <Card key={scope.name}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{scope.name}</h3>
                          <Badge variant={scope.enabled ? 'default' : 'secondary'}>
                            {scope.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Range: {scope.startingAddress} - {scope.endingAddress}</p>
                          <p>Subnet Mask: {scope.subnetMask}</p>
                          <p>
                            Lease Time: {scope.leaseTimeDays}d {scope.leaseTimeHours}h {scope.leaseTimeMinutes}m
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditScope(scope)}
                          disabled={processing}
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleScope(scope)}
                          disabled={processing}
                        >
                          {scope.enabled ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-2" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-2" />
                              Enable
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteScope(scope.name)}
                          disabled={processing}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leases Tab */}
        <TabsContent value="leases" className="space-y-4">
          {leases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No DHCP leases found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {leases.map((lease, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold font-mono">{lease.address}</h3>
                          <Badge variant={lease.type === 'Reserved' ? 'default' : 'secondary'}>
                            {lease.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Scope: {lease.scope}</p>
                          <p>MAC Address: {lease.hardwareAddress}</p>
                          {lease.hostName && <p>Hostname: {lease.hostName}</p>}
                          {lease.leaseObtained && <p>Obtained: {lease.leaseObtained}</p>}
                          {lease.leaseExpires && <p>Expires: {lease.leaseExpires}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {lease.type === 'Reserved' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToDynamic(lease)}
                            disabled={processing}
                          >
                            Convert to Dynamic
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConvertToReserved(lease)}
                            disabled={processing}
                          >
                            Convert to Reserved
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveLease(lease)}
                          disabled={processing}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Scope Dialog */}
      <Dialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingScope ? 'Edit Scope' : 'Add Scope'}</DialogTitle>
            <DialogDescription>
              Configure DHCP scope settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scope-name">Scope Name *</Label>
              <Input
                id="scope-name"
                value={scopeForm.name}
                onChange={(e) => setScopeForm({ ...scopeForm, name: e.target.value })}
                placeholder="e.g., Default"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="starting-address">Starting Address *</Label>
                <Input
                  id="starting-address"
                  value={scopeForm.startingAddress}
                  onChange={(e) => setScopeForm({ ...scopeForm, startingAddress: e.target.value })}
                  placeholder="e.g., 192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ending-address">Ending Address *</Label>
                <Input
                  id="ending-address"
                  value={scopeForm.endingAddress}
                  onChange={(e) => setScopeForm({ ...scopeForm, endingAddress: e.target.value })}
                  placeholder="e.g., 192.168.1.200"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subnet-mask">Subnet Mask *</Label>
              <Input
                id="subnet-mask"
                value={scopeForm.subnetMask}
                onChange={(e) => setScopeForm({ ...scopeForm, subnetMask: e.target.value })}
                placeholder="e.g., 255.255.255.0"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lease-days">Lease Days</Label>
                <Input
                  id="lease-days"
                  type="number"
                  min="0"
                  value={scopeForm.leaseTimeDays}
                  onChange={(e) => setScopeForm({ ...scopeForm, leaseTimeDays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lease-hours">Lease Hours</Label>
                <Input
                  id="lease-hours"
                  type="number"
                  min="0"
                  max="23"
                  value={scopeForm.leaseTimeHours}
                  onChange={(e) => setScopeForm({ ...scopeForm, leaseTimeHours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lease-minutes">Lease Minutes</Label>
                <Input
                  id="lease-minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={scopeForm.leaseTimeMinutes}
                  onChange={(e) => setScopeForm({ ...scopeForm, leaseTimeMinutes: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="router-address">Router Address (Optional)</Label>
              <Input
                id="router-address"
                value={scopeForm.routerAddress || ''}
                onChange={(e) => setScopeForm({ ...scopeForm, routerAddress: e.target.value })}
                placeholder="e.g., 192.168.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dns-servers">DNS Servers (Optional)</Label>
              <Input
                id="dns-servers"
                value={scopeForm.dnsServers || ''}
                onChange={(e) => setScopeForm({ ...scopeForm, dnsServers: e.target.value })}
                placeholder="e.g., 8.8.8.8, 8.8.4.4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain-name">Domain Name (Optional)</Label>
              <Input
                id="domain-name"
                value={scopeForm.domainName || ''}
                onChange={(e) => setScopeForm({ ...scopeForm, domainName: e.target.value })}
                placeholder="e.g., local"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScopeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveScope} disabled={processing}>
              {editingScope ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
