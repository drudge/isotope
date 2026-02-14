import { useEffect, useState } from 'react';
import { Trash2, Plus, ChevronRight } from 'lucide-react';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  listGroups,
  createGroup,
  deleteGroup,
  setGroupDetails,
  getGroupDetails,
  type Group,
} from '@/api/groups';
import { listUsers, type User } from '@/api/users';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface GroupsProps {
  onDataLoaded?: (count: number) => void;
}

export default function Groups({ onDataLoaded }: GroupsProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Member counts for table display
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, string[]>>({});

  // Add group form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Edit group form
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMembers, setEditMembers] = useState<string[]>([]);
  const [memberFilter, setMemberFilter] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await listGroups();
      if (response.status === 'ok' && response.response) {
        const groupList = response.response.groups || [];
        setGroups(groupList);
        onDataLoaded?.(groupList.length);

        // Fetch member details for all groups
        const map: Record<string, string[]> = {};
        await Promise.all(
          groupList.map(async (group) => {
            const details = await getGroupDetails(group.name, true);
            if (details.status === 'ok' && details.response?.members) {
              map[group.name] = details.response.members;
            } else {
              map[group.name] = [];
            }
          })
        );
        setGroupMembersMap(map);
      } else {
        toast.error('Failed to load groups');
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await listUsers();
      if (response.status === 'ok' && response.response) {
        setUsers(response.response.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const handleAddGroup = async () => {
    if (!newName.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const response = await createGroup({
        group: newName,
        description: newDescription || undefined,
      });

      if (response.status === 'ok') {
        toast.success('Group created successfully');
        setAddGroupOpen(false);
        resetAddForm();
        fetchGroups();
      } else {
        toast.error(response.errorMessage || 'Failed to create group');
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup) return;

    try {
      const params: {
        group: string;
        newGroup?: string;
        description?: string;
        members?: string;
      } = {
        group: selectedGroup.name,
      };

      if (editName !== selectedGroup.name) {
        params.newGroup = editName;
      }

      if (editDescription !== selectedGroup.description) {
        params.description = editDescription;
      }

      params.members = editMembers.join(',');

      const response = await setGroupDetails(params);

      if (response.status === 'ok') {
        toast.success('Group updated successfully');
        setEditGroupOpen(false);
        setSelectedGroup(null);
        resetEditForm();
        fetchGroups();
      } else {
        toast.error(response.errorMessage || 'Failed to update group');
      }
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Failed to update group');
    }
  };

  const handleDelete = async (groupName: string) => {
    try {
      const response = await deleteGroup(groupName);
      if (response.status === 'ok') {
        toast.success('Group deleted successfully');
        fetchGroups();
      } else {
        toast.error('Failed to delete group');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const openEditDialog = async (group: Group) => {
    try {
      const response = await getGroupDetails(group.name, true);
      if (response.status === 'ok' && response.response) {
        const details = response.response;
        setSelectedGroup(details);
        setEditName(details.name);
        setEditDescription(details.description);
        setEditMembers(details.members || []);
        setMemberFilter('');
        setEditGroupOpen(true);
      } else {
        toast.error('Failed to load group details');
      }
    } catch (error) {
      console.error('Failed to load group details:', error);
      toast.error('Failed to load group details');
    }
  };

  const resetAddForm = () => {
    setNewName('');
    setNewDescription('');
  };

  const resetEditForm = () => {
    setEditName('');
    setEditDescription('');
    setEditMembers([]);
    setMemberFilter('');
  };

  const toggleMember = (username: string) => {
    setEditMembers((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(memberFilter.toLowerCase()) ||
      u.displayName.toLowerCase().includes(memberFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IsotopeSpinner size="md" className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Groups</h2>
              {groups.length > 0 && (
                <span className="text-sm text-muted-foreground hidden md:inline">Total Groups: {groups.length}</span>
              )}
            </div>
            <Button onClick={() => setAddGroupOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Group
            </Button>
          </div>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="font-medium">No groups found</p>
            </div>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden divide-y">
                {groups.map((group) => (
                  <button
                    key={group.name}
                    className="w-full text-left p-4 hover:bg-muted/50 flex items-center gap-3"
                    onClick={() => openEditDialog(group)}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{group.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {(groupMembersMap[group.name] || []).length} member{(groupMembersMap[group.name] || []).length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {group.description && (
                        <div className="text-sm text-muted-foreground truncate">{group.description}</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow
                        key={group.name}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEditDialog(group)}
                      >
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {(groupMembersMap[group.name] || []).length} member{(groupMembersMap[group.name] || []).length !== 1 ? 's' : ''}
                            </Badge>
                            {(groupMembersMap[group.name] || []).length > 0 && (
                              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {(groupMembersMap[group.name] || []).slice(0, 3).join(', ')}
                                {(groupMembersMap[group.name] || []).length > 3 && ', ...'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{group.description}</TableCell>
                        <TableCell className="text-right">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Group Dialog */}
      <Dialog
        open={addGroupOpen}
        onOpenChange={(open) => {
          setAddGroupOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Group</DialogTitle>
            <DialogDescription>Create a new group</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="group name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGroupOpen(false)}>
              Close
            </Button>
            <Button onClick={handleAddGroup}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog
        open={editGroupOpen}
        onOpenChange={(open) => {
          setEditGroupOpen(open);
          if (!open) {
            setSelectedGroup(null);
            resetEditForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group details and members</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Group Name</Label>
              <Input id="editName" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Members</Label>
                <span className="text-xs text-muted-foreground">
                  {editMembers.length} selected
                </span>
              </div>
              <Input
                placeholder="Filter users..."
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="h-8"
              />
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {users.length === 0 ? 'No users available' : 'No users match filter'}
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.username} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${user.username}`}
                        checked={editMembers.includes(user.username)}
                        onCheckedChange={() => toggleMember(user.username)}
                      />
                      <Label
                        htmlFor={`member-${user.username}`}
                        className="cursor-pointer flex-1 font-normal"
                      >
                        <span className="font-medium font-mono">{user.username}</span>
                        {user.displayName && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({user.displayName})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                setEditGroupOpen(false);
                setDeleteConfirm(selectedGroup?.name || null);
              }}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditGroupOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditGroup}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the group <strong>{deleteConfirm}</strong>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
