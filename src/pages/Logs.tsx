import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Settings } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServerLogs from "@/components/ServerLogs";
import QueryLogs from "@/components/QueryLogs";

export default function Logs() {
  useDocumentTitle("Logs");
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "queries" ? "queries" : "server";
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1 hidden sm:block">
            View server logs and DNS query history
          </p>
        </div>
        <Button variant="outline" size="icon" asChild>
          <Link to="/settings?tab=logging">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="w-full sm:w-fit grid grid-cols-2 sm:flex">
          <TabsTrigger value="server">Server Logs</TabsTrigger>
          <TabsTrigger value="queries">Query Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="server" className="flex-1 mt-4 min-h-0">
          <ServerLogs />
        </TabsContent>

        <TabsContent value="queries" className="flex-1 mt-4 min-h-0">
          <QueryLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
