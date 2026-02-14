import { useEffect, useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listUsers } from '@/api/users';
import { listGroups } from '@/api/groups';
import { listPermissions } from '@/api/permissions';
import { listSessions } from '@/api/sessions';
import Sessions from '@/components/admin/Sessions';
import Users from '@/components/admin/Users';
import Groups from '@/components/admin/Groups';
import Permissions from '@/components/admin/Permissions';

interface StatCounts {
  users: number | null;
  groups: number | null;
  permissions: number | null;
  sessions: number | null;
}

export default function Administration() {
  useDocumentTitle("Administration");
  const [activeTab, setActiveTab] = useState('users');
  const [counts, setCounts] = useState<StatCounts>({
    users: null,
    groups: null,
    permissions: null,
    sessions: null,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      const [usersRes, groupsRes, permsRes, sessionsRes] = await Promise.allSettled([
        listUsers(),
        listGroups(),
        listPermissions(),
        listSessions(),
      ]);

      setCounts({
        users: usersRes.status === 'fulfilled' && usersRes.value.response
          ? (usersRes.value.response.users || []).length : null,
        groups: groupsRes.status === 'fulfilled' && groupsRes.value.response
          ? (groupsRes.value.response.groups || []).length : null,
        permissions: permsRes.status === 'fulfilled' && permsRes.value.response
          ? (permsRes.value.response.permissions || []).length : null,
        sessions: sessionsRes.status === 'fulfilled' && sessionsRes.value.response
          ? (sessionsRes.value.response.sessions || []).length : null,
      });
    };
    fetchCounts();
  }, []);

  const updateCount = (key: keyof StatCounts) => (count: number) => {
    setCounts((prev) => ({ ...prev, [key]: count }));
  };

  const tabBadge = (key: keyof StatCounts) => {
    const count = counts[key];
    if (count === null) return null;
    return (
      <Badge variant="secondary" className="text-[10px] ml-0.5 px-1.5 min-w-[1.25rem] justify-center">
        {count}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, groups, permissions, and sessions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full sm:w-fit grid grid-cols-2 sm:flex h-auto gap-1 sm:gap-0 sm:h-9">
          <TabsTrigger value="users">Users{tabBadge('users')}</TabsTrigger>
          <TabsTrigger value="groups">Groups{tabBadge('groups')}</TabsTrigger>
          <TabsTrigger value="permissions">Permissions{tabBadge('permissions')}</TabsTrigger>
          <TabsTrigger value="sessions">Sessions{tabBadge('sessions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="flex-1 mt-4">
          <Users onDataLoaded={updateCount('users')} />
        </TabsContent>

        <TabsContent value="groups" className="flex-1 mt-4">
          <Groups onDataLoaded={updateCount('groups')} />
        </TabsContent>

        <TabsContent value="permissions" className="flex-1 mt-4">
          <Permissions onDataLoaded={updateCount('permissions')} />
        </TabsContent>

        <TabsContent value="sessions" className="flex-1 mt-4">
          <Sessions onDataLoaded={updateCount('sessions')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
