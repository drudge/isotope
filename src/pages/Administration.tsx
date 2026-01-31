import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Sessions from '@/components/admin/Sessions';
import Users from '@/components/admin/Users';
import Groups from '@/components/admin/Groups';
import Permissions from '@/components/admin/Permissions';

export default function Administration() {
  useDocumentTitle("Administration");
  const [activeTab, setActiveTab] = useState('sessions');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, sessions, and server permissions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="cluster">Cluster</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="flex-1 mt-4">
          <Sessions />
        </TabsContent>

        <TabsContent value="users" className="flex-1 mt-4">
          <Users />
        </TabsContent>

        <TabsContent value="groups" className="flex-1 mt-4">
          <Groups />
        </TabsContent>

        <TabsContent value="permissions" className="flex-1 mt-4">
          <Permissions />
        </TabsContent>

        <TabsContent value="cluster" className="flex-1 mt-4">
          <div className="text-muted-foreground">Cluster management - Coming soon</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
