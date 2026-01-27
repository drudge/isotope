import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  CartesianGrid,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { getStats } from "@/api/dns";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

// Stat box component matching Technitium's colored boxes
interface StatBoxProps {
  label: string;
  value: number | string;
  subValue?: string;
  color: string;
  isLoading?: boolean;
}

function StatBox({ label, value, subValue, color, isLoading }: StatBoxProps) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3 text-white min-w-[120px] flex flex-col",
        color,
      )}
    >
      {isLoading ? (
        <>
          <Skeleton className="h-7 w-16 bg-white/20" />
          <Skeleton className="h-3 w-12 bg-white/20 mt-1" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          <div className="text-[11px] opacity-75 mt-0.5 h-4">
            {subValue || "\u00A0"}
          </div>
        </>
      )}
      <div className="text-xs font-medium mt-1.5 opacity-90">{label}</div>
    </div>
  );
}

interface ChartDataset {
  label: string;
  backgroundColor: string;
  borderColor: string;
  data: number[];
}

interface ChartData {
  labelFormat: string;
  labels: string[];
  datasets: ChartDataset[];
}

interface StatsResponse {
  stats: {
    totalQueries: number;
    totalNoError: number;
    totalServerFailure: number;
    totalNxDomain: number;
    totalRefused: number;
    totalAuthoritative: number;
    totalRecursive: number;
    totalCached: number;
    totalBlocked: number;
    totalDropped: number;
    totalClients: number;
    zones: number;
    cachedEntries: number;
    allowedZones: number;
    blockedZones: number;
    blockListZones: number;
  };
  mainChartData: ChartData;
  queryResponseChartData: ChartData;
  queryTypeChartData: ChartData;
  protocolTypeChartData: ChartData;
  topClients: Array<{
    name: string;
    domain: string;
    hits: number;
    rateLimited: boolean;
  }>;
  topDomains: Array<{ name: string; hits: number }>;
  topBlockedDomains: Array<{ name: string; hits: number }>;
}

type TimeRange = "LastHour" | "LastDay" | "LastWeek" | "LastMonth" | "LastYear";

// Chart colors matching Technitium's scheme
const TECHNITIUM_COLORS = {
  total: "#5b9bd5",
  noError: "#70ad47",
  serverFailure: "#ff6384",
  nxDomain: "#a5a5a5",
  refused: "#4bc0c0",
  authoritative: "#5b9bd5",
  recursive: "#70ad47",
  cached: "#ffc000",
  blocked: "#ff9f40",
  dropped: "#ff6384",
  clients: "#9966ff",
};

const mainChartConfig = {
  total: { label: "Total", color: TECHNITIUM_COLORS.total },
  noError: { label: "No Error", color: TECHNITIUM_COLORS.noError },
  serverFailure: {
    label: "Server Failure",
    color: TECHNITIUM_COLORS.serverFailure,
  },
  nxDomain: { label: "NX Domain", color: TECHNITIUM_COLORS.nxDomain },
  refused: { label: "Refused", color: TECHNITIUM_COLORS.refused },
  authoritative: {
    label: "Authoritative",
    color: TECHNITIUM_COLORS.authoritative,
  },
  recursive: { label: "Recursive", color: TECHNITIUM_COLORS.recursive },
  cached: { label: "Cached", color: TECHNITIUM_COLORS.cached },
  blocked: { label: "Blocked", color: TECHNITIUM_COLORS.blocked },
  dropped: { label: "Dropped", color: TECHNITIUM_COLORS.dropped },
  clients: { label: "Clients", color: TECHNITIUM_COLORS.clients },
} satisfies ChartConfig;

const DONUT_COLORS = [
  "#5b9bd5",
  "#70ad47",
  "#ffc000",
  "#ff9f40",
  "#ff6384",
  "#9966ff",
  "#4bc0c0",
];

function formatTime(isoString: string, format: string): string {
  const normalizedString = isoString.replace(/(\.\d{3})\d+Z$/, "$1Z");
  const date = new Date(normalizedString);
  if (isNaN(date.getTime())) return isoString;

  if (format === "HH:mm") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (format === "MM/dd HH:mm" || format === "MMM dd") {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleString();
}

function transformMainChartData(chartData: ChartData) {
  return chartData.labels.map((label, i) => ({
    time: formatTime(label, chartData.labelFormat),
    total: chartData.datasets.find((d) => d.label === "Total")?.data[i] ?? 0,
    noError:
      chartData.datasets.find((d) => d.label === "No Error")?.data[i] ?? 0,
    serverFailure:
      chartData.datasets.find((d) => d.label === "Server Failure")?.data[i] ??
      0,
    nxDomain:
      chartData.datasets.find((d) => d.label === "NX Domain")?.data[i] ?? 0,
    refused:
      chartData.datasets.find((d) => d.label === "Refused")?.data[i] ?? 0,
    authoritative:
      chartData.datasets.find((d) => d.label === "Authoritative")?.data[i] ?? 0,
    recursive:
      chartData.datasets.find((d) => d.label === "Recursive")?.data[i] ?? 0,
    cached: chartData.datasets.find((d) => d.label === "Cached")?.data[i] ?? 0,
    blocked:
      chartData.datasets.find((d) => d.label === "Blocked")?.data[i] ?? 0,
    dropped:
      chartData.datasets.find((d) => d.label === "Dropped")?.data[i] ?? 0,
    clients:
      chartData.datasets.find((d) => d.label === "Clients")?.data[i] ?? 0,
  }));
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
}

function calculatePercentage(value: number, total: number): string {
  if (total === 0) return "0.00%";
  return ((value / total) * 100).toFixed(2) + "%";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>("LastHour");
  const [expandedLists, setExpandedLists] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useApi<StatsResponse>(
    () =>
      getStats(timeRange) as Promise<
        import("@/types/api").ApiResponse<StatsResponse>
      >,
    [timeRange],
  );

  const stats = statsData?.stats;
  const mainChartData = statsData?.mainChartData
    ? transformMainChartData(statsData.mainChartData)
    : [];

  // Response type donut data
  const responseTypeData = stats
    ? [
        { name: "Authoritative", value: stats.totalAuthoritative },
        { name: "Recursive", value: stats.totalRecursive },
        { name: "Cached", value: stats.totalCached },
        { name: "Blocked", value: stats.totalBlocked },
        { name: "Dropped", value: stats.totalDropped },
      ].filter((d) => d.value > 0)
    : [];

  // Query type donut data
  const queryTypeData =
    statsData?.queryTypeChartData?.labels
      .map((label, index) => ({
        name: label,
        value: statsData.queryTypeChartData.datasets[0]?.data[index] ?? 0,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value) ?? [];

  // Protocol type donut data
  const protocolTypeData =
    statsData?.protocolTypeChartData?.labels
      .map((label, index) => ({
        name: label.toUpperCase(),
        value: statsData.protocolTypeChartData.datasets[0]?.data[index] ?? 0,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value) ?? [];

  const topDomainsData = statsData?.topDomains?.slice(0, 10) ?? [];
  const topBlockedDomainsData =
    statsData?.topBlockedDomains?.slice(0, 10) ?? [];
  const topClientsData = statsData?.topClients?.slice(0, 10) ?? [];

  return (
    <div className="space-y-4">
      {/* Stats Row - Matching Technitium's colored boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatBox
          label="Total Queries"
          value={stats?.totalQueries ?? 0}
          subValue="100%"
          color="bg-blue-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="No Error"
          value={stats?.totalNoError ?? 0}
          subValue={
            stats
              ? calculatePercentage(stats.totalNoError, stats.totalQueries)
              : undefined
          }
          color="bg-green-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="Server Failure"
          value={stats?.totalServerFailure ?? 0}
          subValue={
            stats
              ? calculatePercentage(
                  stats.totalServerFailure,
                  stats.totalQueries,
                )
              : undefined
          }
          color="bg-red-400"
          isLoading={statsLoading}
        />
        <StatBox
          label="NX Domain"
          value={stats?.totalNxDomain ?? 0}
          subValue={
            stats
              ? calculatePercentage(stats.totalNxDomain, stats.totalQueries)
              : undefined
          }
          color="bg-gray-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="Refused"
          value={stats?.totalRefused ?? 0}
          subValue={
            stats
              ? calculatePercentage(stats.totalRefused, stats.totalQueries)
              : undefined
          }
          color="bg-teal-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="Authoritative"
          value={stats?.totalAuthoritative ?? 0}
          subValue={
            stats
              ? calculatePercentage(
                  stats.totalAuthoritative,
                  stats.totalQueries,
                )
              : undefined
          }
          color="bg-blue-400"
          isLoading={statsLoading}
        />
        <StatBox
          label="Recursive"
          value={stats?.totalRecursive ?? 0}
          subValue={
            stats
              ? calculatePercentage(stats.totalRecursive, stats.totalQueries)
              : undefined
          }
          color="bg-green-400"
          isLoading={statsLoading}
        />
        <StatBox
          label="Cached"
          value={stats?.totalCached ?? 0}
          subValue={
            stats
              ? calculatePercentage(stats.totalCached, stats.totalQueries)
              : undefined
          }
          color="bg-yellow-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="Blocked"
          value={stats?.totalBlocked ?? 0}
          subValue={
            stats
              ? calculatePercentage(stats.totalBlocked, stats.totalQueries)
              : undefined
          }
          color="bg-orange-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="Dropped"
          value={stats?.totalDropped ?? 0}
          subValue={
            stats
              ? calculatePercentage(stats.totalDropped, stats.totalQueries)
              : undefined
          }
          color="bg-red-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="Clients"
          value={stats?.totalClients ?? 0}
          color="bg-purple-500"
          isLoading={statsLoading}
        />
        <StatBox
          label="Cache Hit Rate"
          value={
            stats
              ? `${((stats.totalCached / stats.totalQueries) * 100).toFixed(1)}%`
              : "0%"
          }
          subValue={
            stats ? `${formatNumber(stats.totalCached)} hits` : undefined
          }
          color="bg-cyan-500"
          isLoading={statsLoading}
        />
      </div>

      {/* Main Line Chart */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-semibold">
              Query Statistics
            </CardTitle>
            <Tabs
              value={timeRange}
              onValueChange={(v) => setTimeRange(v as TimeRange)}
            >
              <TabsList className="h-8 sm:h-9 w-full sm:w-auto grid grid-cols-5 sm:flex">
                <TabsTrigger value="LastHour" className="text-xs px-2 sm:px-3">
                  Hour
                </TabsTrigger>
                <TabsTrigger value="LastDay" className="text-xs px-2 sm:px-3">
                  Day
                </TabsTrigger>
                <TabsTrigger value="LastWeek" className="text-xs px-2 sm:px-3">
                  Week
                </TabsTrigger>
                <TabsTrigger value="LastMonth" className="text-xs px-2 sm:px-3">
                  Month
                </TabsTrigger>
                <TabsTrigger value="LastYear" className="text-xs px-2 sm:px-3">
                  Year
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : mainChartData.length > 0 ? (
            <ChartContainer
              config={mainChartConfig}
              className="h-[350px] w-full"
            >
              <LineChart
                data={mainChartData}
                margin={{ left: 12, right: 12, top: 10, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                  tickFormatter={(value) => formatNumber(value)}
                  width={60}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={TECHNITIUM_COLORS.total}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="noError"
                  stroke={TECHNITIUM_COLORS.noError}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="serverFailure"
                  stroke={TECHNITIUM_COLORS.serverFailure}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="nxDomain"
                  stroke={TECHNITIUM_COLORS.nxDomain}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="refused"
                  stroke={TECHNITIUM_COLORS.refused}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="authoritative"
                  stroke={TECHNITIUM_COLORS.authoritative}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="recursive"
                  stroke={TECHNITIUM_COLORS.recursive}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cached"
                  stroke={TECHNITIUM_COLORS.cached}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="blocked"
                  stroke={TECHNITIUM_COLORS.blocked}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dropped"
                  stroke={TECHNITIUM_COLORS.dropped}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="clients"
                  stroke={TECHNITIUM_COLORS.clients}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No query data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatBox
          label="Zones"
          value={stats?.zones ?? 0}
          color="bg-slate-600"
          isLoading={statsLoading}
        />
        <StatBox
          label="Cache"
          value={formatNumber(stats?.cachedEntries ?? 0)}
          color="bg-slate-600"
          isLoading={statsLoading}
        />
        <StatBox
          label="Allowed"
          value={stats?.allowedZones ?? 0}
          color="bg-slate-600"
          isLoading={statsLoading}
        />
        <StatBox
          label="Blocked"
          value={stats?.blockedZones ?? 0}
          color="bg-slate-600"
          isLoading={statsLoading}
        />
        <StatBox
          label="Allow List"
          value={stats?.allowedZones ?? 0}
          color="bg-slate-600"
          isLoading={statsLoading}
        />
        <StatBox
          label="Block List"
          value={formatNumber(stats?.blockListZones ?? 0)}
          color="bg-slate-600"
          isLoading={statsLoading}
        />
      </div>

      {/* Three column layout: Top Clients, Top Domains, Top Blocked Domains */}
      <div
        className={cn(
          "grid gap-4",
          topClientsData.length > 0 &&
            topDomainsData.length > 0 &&
            topBlockedDomainsData.length > 0 &&
            "md:grid-cols-2 lg:grid-cols-3",
          topClientsData.length > 0 &&
            topDomainsData.length > 0 &&
            topBlockedDomainsData.length === 0 &&
            "lg:grid-cols-2",
          topClientsData.length > 0 &&
            topDomainsData.length === 0 &&
            topBlockedDomainsData.length > 0 &&
            "lg:grid-cols-2",
          topClientsData.length === 0 &&
            topDomainsData.length > 0 &&
            topBlockedDomainsData.length > 0 &&
            "lg:grid-cols-2",
        )}
      >
        {/* Top Clients */}
        {topClientsData.length > 0 && (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Top Clients
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col">
              {statsLoading ? (
                <div className="space-y-1 px-6">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="divide-y flex-1">
                    {topClientsData
                      .slice(0, expandedLists ? 10 : 5)
                      .map((client) => (
                        <div
                          key={client.name}
                          className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 hover:bg-muted/50 transition-colors h-[56px] cursor-pointer"
                          onClick={() =>
                            navigate(
                              "/logs?tab=queries&clientIp=" +
                                encodeURIComponent(client.name),
                            )
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm truncate">
                              {client.name}
                            </div>
                            {client.domain && (
                              <div className="text-xs text-muted-foreground truncate">
                                {client.domain}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatNumber(client.hits)}
                          </div>
                        </div>
                      ))}
                  </div>
                  {(topClientsData.length > 5 ||
                    topDomainsData.length > 5 ||
                    topBlockedDomainsData.length > 5) && (
                    <div className="flex items-center justify-center pt-2 pb-1 mt-auto">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setExpandedLists(!expandedLists)}
                        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedLists ? (
                          <>
                            Show Less <ChevronUp className="ml-1 h-3 w-3" />
                          </>
                        ) : (
                          <>
                            Show More <ChevronDown className="ml-1 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Domains */}
        {topDomainsData.length > 0 && (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Top Domains
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col">
              {statsLoading ? (
                <div className="space-y-1 px-6">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="divide-y flex-1">
                    {topDomainsData
                      .slice(0, expandedLists ? 10 : 5)
                      .map((domain) => (
                        <div
                          key={domain.name}
                          className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 hover:bg-muted/50 transition-colors h-[56px] cursor-pointer"
                          onClick={() =>
                            navigate(
                              "/logs?tab=queries&qname=" +
                                encodeURIComponent(domain.name),
                            )
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-mono text-sm truncate"
                              title={domain.name}
                            >
                              {domain.name}
                            </div>
                          </div>
                          <div className="text-sm font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatNumber(domain.hits)}
                          </div>
                        </div>
                      ))}
                  </div>
                  {(topClientsData.length > 5 ||
                    topDomainsData.length > 5 ||
                    topBlockedDomainsData.length > 5) && (
                    <div className="flex items-center justify-center pt-2 pb-1 mt-auto">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setExpandedLists(!expandedLists)}
                        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedLists ? (
                          <>
                            Show Less <ChevronUp className="ml-1 h-3 w-3" />
                          </>
                        ) : (
                          <>
                            Show More <ChevronDown className="ml-1 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Blocked Domains */}
        {topBlockedDomainsData.length > 0 && (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Top Blocked Domains
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col">
              {statsLoading ? (
                <div className="space-y-1 px-6">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="divide-y flex-1">
                    {topBlockedDomainsData
                      .slice(0, expandedLists ? 10 : 5)
                      .map((domain) => (
                        <div
                          key={domain.name}
                          className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-2.5 hover:bg-muted/50 transition-colors h-[56px] cursor-pointer"
                          onClick={() =>
                            navigate(
                              "/logs?tab=queries&qname=" +
                                encodeURIComponent(domain.name),
                            )
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <div
                              className="font-mono text-sm truncate"
                              title={domain.name}
                            >
                              {domain.name}
                            </div>
                          </div>
                          <div className="text-sm font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatNumber(domain.hits)}
                          </div>
                        </div>
                      ))}
                  </div>
                  {(topClientsData.length > 5 ||
                    topDomainsData.length > 5 ||
                    topBlockedDomainsData.length > 5) && (
                    <div className="flex items-center justify-center pt-2 pb-1 mt-auto">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setExpandedLists(!expandedLists)}
                        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedLists ? (
                          <>
                            Show Less <ChevronUp className="ml-1 h-3 w-3" />
                          </>
                        ) : (
                          <>
                            Show More <ChevronDown className="ml-1 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Query Types, Protocol Types, and Server Health */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Query Types */}
        {queryTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Query Types
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-shrink-0">
                  <PieChart width={180} height={180}>
                    <Pie
                      data={queryTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {queryTypeData.map((entry, index) => (
                        <Cell
                          key={`query-${entry.name}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatNumber(value)}
                    />
                  </PieChart>
                </div>
                <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
                  {queryTypeData.slice(0, 6).map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="h-3 w-3 rounded flex-shrink-0"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Protocol Types */}
        {protocolTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Protocol Types
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-shrink-0">
                  <PieChart width={180} height={180}>
                    <Pie
                      data={protocolTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {protocolTypeData.map((entry, index) => (
                        <Cell
                          key={`protocol-${entry.name}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatNumber(value)}
                    />
                  </PieChart>
                </div>
                <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
                  {protocolTypeData.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="h-3 w-3 rounded flex-shrink-0"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response Types */}
        {responseTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Response Types
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-shrink-0">
                  <PieChart width={180} height={180}>
                    <Pie
                      data={responseTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {responseTypeData.map((entry, index) => (
                        <Cell
                          key={`response-${entry.name}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatNumber(value)}
                    />
                  </PieChart>
                </div>
                <div className="w-full sm:flex-1 space-y-1.5 min-w-0">
                  {responseTypeData.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className="h-3 w-3 rounded flex-shrink-0"
                        style={{
                          backgroundColor:
                            DONUT_COLORS[i % DONUT_COLORS.length],
                        }}
                      />
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="font-medium tabular-nums text-muted-foreground whitespace-nowrap">
                        {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
