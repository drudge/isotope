import { useEffect, useState } from 'react';
import { Trash2, Plus, ChevronRight } from 'lucide-react';
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyableText } from '@/components/ui/copyable-text';
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
import { Checkbox } from '@/components/ui/checkbox';
import { listUsers, createUser, deleteUser, setUserDetails, type User } from '@/api/users';
import { toast } from 'sonner';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Add user form
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Edit user form
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
  const [editDisabled, setEditDisabled] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await listUsers();
      if (response.status === 'ok' && response.response) {
        setUsers(response.response.users || []);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUsername.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!newPassword) {
      toast.error('Password is required');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await createUser({
        username: newUsername,
        password: newPassword,
        displayName: newDisplayName || undefined,
      });

      if (response.status === 'ok') {
        toast.success('User created successfully');
        setAddUserOpen(false);
        resetAddForm();
        fetchUsers();
      } else {
        toast.error(response.errorMessage || 'Failed to create user');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    if (editPassword && editPassword !== editPasswordConfirm) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const params: {
        username: string;
        displayName?: string;
        newUsername?: string;
        newPassword?: string;
        disabled?: boolean;
      } = {
        username: selectedUser.username,
      };

      if (editDisplayName !== selectedUser.displayName) {
        params.displayName = editDisplayName;
      }

      if (editUsername !== selectedUser.username) {
        params.newUsername = editUsername;
      }

      if (editPassword) {
        params.newPassword = editPassword;
      }

      if (editDisabled !== selectedUser.disabled) {
        params.disabled = editDisabled;
      }

      const response = await setUserDetails(params);

      if (response.status === 'ok') {
        toast.success('User updated successfully');
        setEditUserOpen(false);
        setSelectedUser(null);
        resetEditForm();
        fetchUsers();
      } else {
        toast.error(response.errorMessage || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDelete = async (username: string) => {
    try {
      const response = await deleteUser(username);
      if (response.status === 'ok') {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditDisplayName(user.displayName);
    setEditUsername(user.username);
    setEditPassword('');
    setEditPasswordConfirm('');
    setEditDisabled(user.disabled);
    setEditUserOpen(true);
  };

  const resetAddForm = () => {
    setNewDisplayName('');
    setNewUsername('');
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  const resetEditForm = () => {
    setEditDisplayName('');
    setEditUsername('');
    setEditPassword('');
    setEditPasswordConfirm('');
    setEditDisabled(false);
  };

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
              <h2 className="text-lg font-semibold">Users</h2>
              {users.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Total Users: {users.length}
                </span>
              )}
            </div>
            <Button onClick={() => setAddUserOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>

          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="font-medium">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.username}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEditDialog(user)}
                    >
                      <TableCell className="font-medium font-mono">{user.username}</TableCell>
                      <TableCell>{user.displayName}</TableCell>
                      <TableCell>
                        <span
                          className={
                            user.disabled
                              ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400'
                          }
                        >
                          {user.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.recentSessionLoggedOn && user.recentSessionLoggedOn !== '0001-01-01T00:00:00' ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              {new Date(user.recentSessionLoggedOn).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              from <CopyableText text={user.recentSessionRemoteAddress} showIcon={false} className="font-mono" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={(open) => {
        setAddUserOpen(open);
        if (!open) resetAddForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="display name"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="confirm password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>
              Close
            </Button>
            <Button onClick={handleAddUser}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={(open) => {
        setEditUserOpen(open);
        if (!open) {
          setSelectedUser(null);
          resetEditForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user account details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDisplayName">Display Name</Label>
              <Input
                id="editDisplayName"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUsername">Username</Label>
              <Input
                id="editUsername"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">New Password (leave empty to keep current)</Label>
              <Input
                id="editPassword"
                type="password"
                placeholder="new password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
            {editPassword && (
              <div className="space-y-2">
                <Label htmlFor="editConfirmPassword">Confirm New Password</Label>
                <Input
                  id="editConfirmPassword"
                  type="password"
                  placeholder="confirm new password"
                  value={editPasswordConfirm}
                  onChange={(e) => setEditPasswordConfirm(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editDisabled"
                checked={editDisabled}
                onCheckedChange={(checked) => setEditDisabled(checked as boolean)}
              />
              <Label htmlFor="editDisabled" className="cursor-pointer">
                Disabled
              </Label>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                setEditUserOpen(false);
                setDeleteConfirm(selectedUser?.username || null);
              }}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditUser}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the user <strong>{deleteConfirm}</strong>? This action cannot be undone and will delete all active sessions for this user.
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
