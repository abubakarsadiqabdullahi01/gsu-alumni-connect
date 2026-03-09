"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Layers3,
  MoreHorizontal,
  Search,
  Sparkles,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type GroupRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "COHORT" | "DEPARTMENT" | "FACULTY" | "STATE" | "CUSTOM";
  isAuto: boolean;
  createdAt: string;
  memberCount: number;
  postCount: number;
};

type GroupsPayload = {
  groups: GroupRow[];
  stats: {
    totalGroups: number;
    autoGroups: number;
    customGroups: number;
    totalMembers: number;
    totalPosts: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const typeColors: Record<GroupRow["type"], string> = {
  COHORT: "bg-blue-50 text-blue-700",
  DEPARTMENT: "bg-amber-50 text-amber-700",
  FACULTY: "bg-fuchsia-50 text-fuchsia-700",
  STATE: "bg-cyan-50 text-cyan-700",
  CUSTOM: "bg-slate-100 text-slate-700",
};

export function AdminGroupsClient() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<GroupsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "12");
      if (search.trim()) params.set("q", search.trim());
      if (type !== "all") params.set("type", type);
      if (source !== "all") params.set("source", source);

      const res = await fetch(`/api/admin/groups?${params.toString()}`);
      const json = (await res.json()) as GroupsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load groups.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Failed to load groups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, search, type, source]);

  useEffect(() => {
    setPage(1);
  }, [search, type, source]);

  const deleteGroup = async (groupId: string) => {
    setBusy(groupId);
    setError("");
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to delete group.");
        return;
      }
      await load();
    } catch {
      setError("Failed to delete group.");
    } finally {
      setBusy(null);
    }
  };

  const groups = payload?.groups ?? [];
  const stats = payload?.stats;
  const pagination = payload?.pagination;

  const pageLabel = useMemo(() => {
    if (!pagination) return "";
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.total, pagination.page * pagination.pageSize);
    return `${start}-${end} of ${pagination.total}`;
  }, [pagination]);

  return (
    <>
      <DashboardHeader title="Admin Groups" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Group Administration</h1>
          <p className="text-sm text-muted-foreground">Monitor auto and custom alumni groups and moderate content.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Total Groups</p><p className="text-2xl font-bold">{stats?.totalGroups ?? 0}</p></div><Layers3 className="size-5 text-primary" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Auto Groups</p><p className="text-2xl font-bold">{stats?.autoGroups ?? 0}</p></div><Sparkles className="size-5 text-cyan-500" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Custom Groups</p><p className="text-2xl font-bold">{stats?.customGroups ?? 0}</p></div><UsersRound className="size-5 text-amber-500" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Total Members</p><p className="text-2xl font-bold">{stats?.totalMembers ?? 0}</p></div><Users className="size-5 text-emerald-500" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Total Posts</p><p className="text-2xl font-bold">{stats?.totalPosts ?? 0}</p></div><Layers3 className="size-5 text-violet-500" /></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Search by group name, description, or slug.</CardDescription>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups" />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="COHORT">Cohort</SelectItem>
                  <SelectItem value="DEPARTMENT">Department</SelectItem>
                  <SelectItem value="FACULTY">Faculty</SelectItem>
                  <SelectItem value="STATE">State</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="auto">Auto Generated</SelectItem>
                  <SelectItem value="custom">User Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {loading ? <p className="text-sm text-muted-foreground">Loading groups...</p> : null}
            {!loading && groups.length === 0 ? <p className="text-sm text-muted-foreground">No groups found.</p> : null}

            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{group.name}</p>
                        <Badge className={typeColors[group.type]}>{group.type}</Badge>
                        <Badge variant="outline">{group.isAuto ? "Auto" : "Custom"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">/{group.slug} • Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}</p>
                      {group.description ? <p className="text-sm text-muted-foreground">{group.description}</p> : null}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{group.memberCount} members</span>
                        <span>{group.postCount} posts</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/groups/${group.id}`}>View</Link>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" disabled={busy === group.id}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!group.isAuto ? (
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteGroup(group.id)}>
                              <Trash2 className="mr-2 size-4" />
                              Delete Group
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>Auto groups cannot be deleted</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pagination ? (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">{pageLabel}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>Next</Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

