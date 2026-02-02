import { useEffect, useState } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
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

export default function Permissions() {
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

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await listPermissions();
      if (response.status === "ok" && response.response) {
        setPermissionsList(response.response.permissions || []);
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
        userPermissions: userPermsString || undefined,
        groupPermissions: groupPermsString || undefined,
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

  const _addUserPermission = (username: string) => {
    if (!editUserPermissions.find((u) => u.username === username)) {
      setEditUserPermissions((prev) => [
        ...prev,
        { username, canView: false, canModify: false, canDelete: false },
      ]);
    }
  };

  const _addGroupPermission = (groupName: string) => {
    if (!editGroupPermissions.find((g) => g.name === groupName)) {
      setEditGroupPermissions((prev) => [
        ...prev,
        { name: groupName, canView: false, canModify: false, canDelete: false },
      ]);
    }
  };

  const _removeUserPermission = (username: string) => {
    setEditUserPermissions((prev) =>
      prev.filter((u) => u.username !== username),
    );
  };

  const _removeGroupPermission = (groupName: string) => {
    setEditGroupPermissions((prev) => prev.filter((g) => g.name !== groupName));
  };

  // Suppress unused variable warnings - these will be used in future UI implementation
  void _addUserPermission;
  void _addGroupPermission;
  void _removeUserPermission;
  void _removeGroupPermission;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                <span className="text-sm text-muted-foreground">
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
            <div className="overflow-x-auto">
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
                      <TableCell className="text-muted-foreground">
                        {permission.userPermissions.length} user(s)
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {permission.groupPermissions.length} group(s)
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

      {/* Edit Permissions Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedSection(null);
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
              </div>
              {editGroupPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No group permissions configured
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
              </div>
              {editUserPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No user permissions configured
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                                    Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
