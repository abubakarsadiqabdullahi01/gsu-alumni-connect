"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Users,
  UserCheck,
  Clock,
  ShieldOff,
  TrendingUp,
  Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type NetworkPayload = {
  stats: {
    totalConnections: number;
    acceptedConnections: number;
    pendingConnections: number;
    blockedConnections: number;
    avgConnectionsPerUser: number;
  };
  connectionsGrowth: Array<{ month: string; connections: number }>;
  connectionsByFaculty: Array<{ faculty: string; connections: number }>;
  topConnectors: Array<{ id: string; name: string; department: string; connections: number }>;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function AdminNetworkClient() {
  const [data, setData] = useState<NetworkPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/network");
      const json = (await res.json()) as NetworkPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load network analytics.");
        return;
      }
      setData(json);
    } catch {
      setError("Failed to load network analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const maxConnector = useMemo(() => {
    if (!data || data.topConnectors.length === 0) return 1;
    return Math.max(...data.topConnectors.map((x) => x.connections), 1);
  }, [data]);

  return (
    <>
      <DashboardHeader title="Network Overview" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Total Connections" value={(data?.stats.totalConnections ?? 0).toLocaleString()} icon={Globe} />
          <StatCard title="Accepted" value={(data?.stats.acceptedConnections ?? 0).toLocaleString()} icon={UserCheck} />
          <StatCard title="Pending" value={(data?.stats.pendingConnections ?? 0).toLocaleString()} icon={Clock} />
          <StatCard title="Blocked" value={(data?.stats.blockedConnections ?? 0).toLocaleString()} icon={ShieldOff} />
          <StatCard title="Avg / User" value={(data?.stats.avgConnectionsPerUser ?? 0).toFixed(1)} icon={TrendingUp} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-bold">Connections Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading chart...</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.connectionsGrowth ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          fontSize: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="connections"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.15)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] font-bold">Connections by Faculty</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading chart...</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.connectionsByFaculty ?? []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="faculty" type="category" tick={{ fontSize: 10 }} width={140} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          fontSize: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="connections" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[13px] font-bold">
              <Crown className="size-4 text-amber-500" />
              Top Connectors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading top connectors...</p>
            ) : (data?.topConnectors.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No connector data yet.</p>
            ) : (
              data?.topConnectors.map((person, index) => (
                <div key={person.id} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50">
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-extrabold">{index + 1}</span>
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{getInitials(person.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold">{person.name}</p>
                    <p className="text-[10px] text-muted-foreground">{person.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-extrabold">{person.connections}</p>
                    <p className="text-[10px] text-muted-foreground">connections</p>
                  </div>
                  <Progress value={(person.connections / maxConnector) * 100} className="hidden w-24 sm:block" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
