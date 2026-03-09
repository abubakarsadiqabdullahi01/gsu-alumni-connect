"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Compass,
  Filter,
  Globe,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  Users,
  UsersRound,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type GroupItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE" | "CUSTOM";
  isAuto: boolean;
  cohortYear: string | null;
  facultyCode: string | null;
  courseCode: string | null;
  stateCode: string | null;
  memberCount: number;
  postCount: number;
  lastPost: { id: string; content: string; createdAt: string } | null;
  membership: { role: "ADMIN" | "MODERATOR" | "MEMBER"; joinedAt: string } | null;
  createdAt: string;
};

type GroupsPayload = {
  groups: GroupItem[];
  stats: {
    total: number;
    joined: number;
  };
};

const typeIcons: Record<GroupItem["type"], React.ElementType> = {
  COHORT: GraduationCap,
  DEPARTMENT: Sparkles,
  FACULTY: Globe,
  STATE: MapPin,
  CUSTOM: Users,
};

const typeBadgeClass: Record<GroupItem["type"], string> = {
  COHORT: "bg-blue-50 text-blue-700",
  DEPARTMENT: "bg-amber-50 text-amber-700",
  FACULTY: "bg-violet-50 text-violet-700",
  STATE: "bg-teal-50 text-teal-700",
  CUSTOM: "bg-rose-50 text-rose-700",
};

export function GroupsClient() {
  const router = useRouter();
  const [data, setData] = useState<GroupsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | GroupItem["type"]>("ALL");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      const json = (await res.json()) as GroupsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load groups.");
        return;
      }
      setData(json);
    } catch {
      setError("Unable to load groups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return { joined: [], discover: [] } as { joined: GroupItem[]; discover: GroupItem[] };
    const base = data.groups.filter((g) => {
      const okType = typeFilter === "ALL" ? true : g.type === typeFilter;
      const term = query.trim().toLowerCase();
      const okQuery =
        !term ||
        g.name.toLowerCase().includes(term) ||
        (g.description ?? "").toLowerCase().includes(term) ||
        g.type.toLowerCase().includes(term);
      return okType && okQuery;
    });
    return {
      joined: base.filter((g) => Boolean(g.membership)),
      discover: base.filter((g) => !g.membership),
    };
  }, [data, query, typeFilter]);

  const toggleMembership = async (groupId: string, joined: boolean) => {
    setError("");
    setBusyId(groupId);
    try {
      const res = await fetch(`/api/groups/${groupId}/membership`, {
        method: joined ? "DELETE" : "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Action failed.");
        return;
      }
      await load();
    } catch {
      setError("Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const openGroupChat = async (groupId: string) => {
    setBusyId(groupId);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/conversation`, { method: "POST" });
      const json = (await res.json()) as { error?: string; conversationId?: string };
      if (!res.ok || !json.conversationId) {
        setError(json.error ?? "Unable to open group chat.");
        return;
      }
      router.push(`/messages?conversationId=${json.conversationId}`);
    } catch {
      setError("Unable to open group chat.");
    } finally {
      setBusyId(null);
    }
  };

  const renderGroupCard = (group: GroupItem, index: number) => {
    const Icon = typeIcons[group.type];
    const joined = Boolean(group.membership);
    return (
      <motion.div
        key={group.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
      >
        <Card className="h-full border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{group.name}</h3>
                  <Badge className={`mt-0.5 text-[10px] ${typeBadgeClass[group.type]}`}>
                    {group.type.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1.5">
                {group.isAuto ? <Badge variant="outline" className="text-[9px]">Auto</Badge> : null}
                {joined ? <Badge variant="secondary" className="text-[9px]">Joined</Badge> : null}
              </div>
            </div>

            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {group.description ?? "No description available."}
            </p>

            <div className="mt-3 rounded-lg bg-muted/40 p-2.5">
              <p className="line-clamp-1 text-[11px] text-muted-foreground italic">
                {group.lastPost ? `“${group.lastPost.content}”` : "No posts yet"}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3" />
                {group.memberCount.toLocaleString()} members
              </span>
              {joined ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs" asChild>
                    <Link href={`/groups/${group.id}/posts`}>View Posts</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={busyId === group.id}
                    onClick={() => openGroupChat(group.id)}
                  >
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={busyId === group.id}
                    onClick={() => toggleMembership(group.id, true)}
                  >
                    Leave
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="text-xs"
                  disabled={busyId === group.id}
                  onClick={() => toggleMembership(group.id, false)}
                >
                  {busyId === group.id ? "Processing..." : "Join"}
                  <ArrowRight className="ml-1 size-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <>
      <DashboardHeader title="Alumni Groups" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Groups</CardTitle>
            <CardDescription>
              Auto-generated cohorts, faculty, department, and location groups from uploaded records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Groups</p>
              <p className="text-2xl font-bold">{data?.stats.total ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">My Groups</p>
              <p className="text-2xl font-bold">{data?.stats.joined ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              placeholder="Search groups by name, description, or type"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
            <Filter className="size-3.5 text-muted-foreground" />
            {(["ALL", "COHORT", "DEPARTMENT", "FACULTY", "STATE", "CUSTOM"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={typeFilter === t ? "default" : "outline"}
                className="h-7 px-2 text-[11px]"
                onClick={() => setTypeFilter(t)}
              >
                {t === "ALL" ? "All" : t.replace("_", " ")}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="joined" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1">
            <TabsTrigger
              value="joined"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
            >
              <UsersRound className="size-3.5" />
              <span>My Groups</span>
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                {filtered.joined.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
            >
              <Compass className="size-3.5" />
              <span>Discover</span>
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                {filtered.discover.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="joined" className="space-y-4">
            {loading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading groups...</CardContent></Card>
            ) : filtered.joined.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">You have not joined any groups yet.</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.joined.map((group, idx) => renderGroupCard(group, idx))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            {loading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading groups...</CardContent></Card>
            ) : filtered.discover.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No new groups to discover right now.</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.discover.map((group, idx) => renderGroupCard(group, idx))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
