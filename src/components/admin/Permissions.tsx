import { useEffect, useState } from "react";
import { ChevronRight, Plus, X } from "lucide-react";
import { IsotopeSpinner } from '@/components/ui/isotope-spinner';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listPermissions,
  getPermissionDetails,
  setPermissions,
  type Permission,
  type PermissionDetailsResponse,
  type UserPermission,
  type GroupPermission,
} from "@/api/permissions";
import { toast } from "sonner";

interface PermissionsProps {
  onDataLoaded?: (count: number) => void;
}

export default function Permissions({ onDataLoaded }: PermissionsProps) {
  const [permissions, setPermissionsList] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] =
    useState<PermissionDetailsResponse | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editUserPermissions, setEditUserPermissions] = useState<
    UserPermission[]
  >([]);
  const [editGroupPermissions, setEditGroupPermissions] = useState<
    GroupPermission[]
  >([]);

  // Available users/groups for adding
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ displayName: string; username: string; disabled: boolean }>
  >([]);
  const [availableGroups, setAvailableGroups] = useState<
    Array<{ name: string; description: string }>
  >([]);

  // Popover state
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [userPickerFilter, setUserPickerFilter] = useState("");
  const [groupPickerFilter, setGroupPickerFilter] = useState("");

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await listPermissions();
      if (response.status === "ok" && response.response) {
        const permList = response.response.permissions || [];
        setPermissionsList(permList);
        onDataLoaded?.(permList.length);
      } else {
        toast.error("Failed to load permissions");
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const openEditDialog = async (permission: Permission) => {
    try {
      const response = await getPermissionDetails(permission.section, true);
      if (response.status === "ok" && response.response) {
        setSelectedSection(response.response);
        setEditUserPermissions(response.response.userPermissions || []);
        setEditGroupPermissions(response.response.groupPermissions || []);
        setAvailableUsers(response.response.users || []);
        setAvailableGroups(response.response.groups || []);
        setEditDialogOpen(true);
      } else {
        toast.error("Failed to load permission details");
      }
    } catch (error) {
      console.error("Failed to load permission details:", error);
      toast.error("Failed to load permission details");
    }
  };

  const handleSave = async () => {
    if (!selectedSection) return;

    setSaving(true);
    try {
      // Format user permissions: user1|true|false|true|user2|false|true|false
      const userPermsString = editUserPermissions
        .map((u) => `${u.username}|${u.canView}|${u.canModify}|${u.canDelete}`)
        .join("|");

      // Format group permissions: group1|true|true|true|group2|true|false|false
      const groupPermsString = editGroupPermissions
        .map((g) => `${g.name}|${g.canView}|${g.canModify}|${g.canDelete}`)
        .join("|");

      const response = await setPermissions({
        section: selectedSection.section,
        userPermissions: userPermsString,
        groupPermissions: groupPermsString,
      });

      if (response.status === "ok") {
        toast.success("Permissions updated successfully");
        setEditDialogOpen(false);
        setSelectedSection(null);
        fetchPermissions();
      } else {
        toast.error(response.errorMessage || "Failed to update permissions");
      }
    } catch (error) {
      console.error("Failed to update permissions:", error);
      toast.error("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  };

  const toggleUserPermission = (
    username: string,
    field: "canView" | "canModify" | "canDelete",
  ) => {
    setEditUserPermissions((prev) =>
      prev.map((u) =>
        u.username === username ? { ...u, [field]: !u[field] } : u,
      ),
    );
  };

  const toggleGroupPermission = (
    name: string,
    field: "canView" | "canModify" | "canDelete",
  ) => {
    setEditGroupPermissions((prev) =>
      prev.map((g) => (g.name === name ? { ...g, [field]: !g[field] } : g)),
    );
  };

  const addUserPermission = (username: string) => {
    if (!editUserPermissions.find((u) => u.username === username)) {
      setEditUserPermissions((prev) => [
        ...prev,
        { username, canView: false, canModify: false, canDelete: false },
      ]);
    }
    setUserPickerOpen(false);
    setUserPickerFilter("");
  };

  const addGroupPermission = (groupName: string) => {
    if (!editGroupPermissions.find((g) => g.name === groupName)) {
      setEditGroupPermissions((prev) => [
        ...prev,
        { name: groupName, canView: false, canModify: false, canDelete: false },
      ]);
    }
    setGroupPickerOpen(false);
    setGroupPickerFilter("");
  };

  const removeUserPermission = (username: string) => {
    setEditUserPermissions((prev) =>
      prev.filter((u) => u.username !== username),
    );
  };

  const removeGroupPermission = (groupName: string) => {
    setEditGroupPermissions((prev) => prev.filter((g) => g.name !== groupName));
  };

  // Filter available users/groups that aren't already in the permissions list
  const filteredAvailableUsers = availableUsers
    .filter((u) => u.username && !editUserPermissions.find((p) => p.username === u.username))
    .filter(
      (u) =>
        (u.username || '').toLowerCase().includes(userPickerFilter.toLowerCase()) ||
        (u.displayName || '').toLowerCase().includes(userPickerFilter.toLowerCase()),
    );

  const filteredAvailableGroups = availableGroups
    .filter((g) => g.name && !editGroupPermissions.find((p) => p.name === g.name))
    .filter(
      (g) =>
        (g.name || '').toLowerCase().includes(groupPickerFilter.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(groupPickerFilter.toLowerCase()),
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
              <h2 className="text-lg font-semibold">Permissions</h2>
              {permissions.length > 0 && (
                <span className="text-sm text-muted-foreground hidden md:inline">
                  Total Sections: {permissions.length}
                </span>
              )}
            </div>
          </div>

          {permissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="font-medium">No permissions found</p>
            </div>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden divide-y">
                {permissions.map((permission) => (
                  <button
                    key={permission.section}
                    className="w-full text-left p-4 hover:bg-muted/50 flex items-center gap-3"
                    onClick={() => openEditDialog(permission)}
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <span className="font-medium text-sm">{permission.section}</span>
                      <div className="flex flex-wrap gap-1">
                        {permission.userPermissions.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {permission.userPermissions.length} user{permission.userPermissions.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {permission.groupPermissions.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {permission.groupPermissions.length} group{permission.groupPermissions.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {permission.userPermissions.length === 0 && permission.groupPermissions.length === 0 && (
                          <span className="text-xs text-muted-foreground">No permissions set</span>
                        )}
                      </div>
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
                      <TableHead>Section</TableHead>
                      <TableHead>User Permissions</TableHead>
                      <TableHead>Group Permissions</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission) => (
                      <TableRow
                        key={permission.section}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEditDialog(permission)}
                      >
                        <TableCell className="font-medium">
                          {permission.section}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {permission.userPermissions.length === 0 ? (
                              <span className="text-sm text-muted-foreground">None</span>
                            ) : (
                              <>
                                {permission.userPermissions.slice(0, 3).map((u) => (
                                  <Badge key={u.username} variant="outline" className="text-xs font-mono">
                                    {u.username}
                                  </Badge>
                                ))}
                                {permission.userPermissions.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{permission.userPermissions.length - 3} more
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {permission.groupPermissions.length === 0 ? (
                              <span className="text-sm text-muted-foreground">None</span>
                            ) : (
                              <>
                                {permission.groupPermissions.slice(0, 3).map((g) => (
                                  <Badge key={g.name} variant="outline" className="text-xs">
                                    {g.name}
                                  </Badge>
                                ))}
                                {permission.groupPermissions.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{permission.groupPermissions.length - 3} more
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
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

      {/* Edit Permissions Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedSection(null);
            setUserPickerFilter("");
            setGroupPickerFilter("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions: {selectedSection?.section}
            </DialogTitle>
            <DialogDescription>
              Configure user and group permissions for this section
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Group Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Group Permissions
                </Label>
                <Popover open={groupPickerOpen} onOpenChange={(open) => {
                  setGroupPickerOpen(open);
                  if (!open) setGroupPickerFilter("");
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add Group
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <div className="p-2">
                      <Input
                        placeholder="Search groups..."
                        value={groupPickerFilter}
                        onChange={(e) => setGroupPickerFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <ScrollArea className="max-h-48">
                      <div className="p-1">
                        {filteredAvailableGroups.length === 0 ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground text-center">
                            {availableGroups.length === 0 ? "No groups available" : "All groups already added"}
                          </p>
                        ) : (
                          filteredAvailableGroups.map((group) => (
                            <button
                              key={group.name}
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm"
                              onClick={() => addGroupPermission(group.name)}
                            >
                              <span className="font-medium">{group.name}</span>
                              {group.description && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  ({group.description})
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              {editGroupPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No group permissions configured. Click &ldquo;Add Group&rdquo; to get started.
                </p>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-center">View</TableHead>
                        <TableHead className="text-center">Modify</TableHead>
                        <TableHead className="text-center">Delete</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editGroupPermissions.map((group) => (
                        <TableRow key={group.name}>
                          <TableCell className="font-medium">
                            {group.name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={group.canView}
                              onCheckedChange={() =>
                                toggleGroupPermission(group.name, "canView")
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={group.canModify}
                              onCheckedChange={() =>
                                toggleGroupPermission(group.name, "canModify")
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={group.canDelete}
                              onCheckedChange={() =>
                                toggleGroupPermission(group.name, "canDelete")
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeGroupPermission(group.name)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* User Permissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  User Permissions
                </Label>
                <Popover open={userPickerOpen} onOpenChange={(open) => {
                  setUserPickerOpen(open);
                  if (!open) setUserPickerFilter("");
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Add User
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <div className="p-2">
                      <Input
                        placeholder="Search users..."
                        value={userPickerFilter}
                        onChange={(e) => setUserPickerFilter(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <ScrollArea className="max-h-48">
                      <div className="p-1">
                        {filteredAvailableUsers.length === 0 ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground text-center">
                            {availableUsers.length === 0 ? "No users available" : "All users already added"}
                          </p>
                        ) : (
                          filteredAvailableUsers.map((user) => (
                            <button
                              key={user.username}
                              className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm"
                              onClick={() => addUserPermission(user.username)}
                            >
                              <span className="font-mono">{user.username}</span>
                              {user.displayName && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  ({user.displayName})
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              {editUserPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No user permissions configured. Click &ldquo;Add User&rdquo; to get started.
                </p>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-center">View</TableHead>
                        <TableHead className="text-center">Modify</TableHead>
                        <TableHead className="text-center">Delete</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editUserPermissions.map((user) => (
                        <TableRow key={user.username}>
                          <TableCell className="font-medium font-mono">
                            {user.username}
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={user.canView}
                              onCheckedChange={() =>
                                toggleUserPermission(user.username, "canView")
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={user.canModify}
                              onCheckedChange={() =>
                                toggleUserPermission(user.username, "canModify")
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={user.canDelete}
                              onCheckedChange={() =>
                                toggleUserPermission(user.username, "canDelete")
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeUserPermission(user.username)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <IsotopeSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
