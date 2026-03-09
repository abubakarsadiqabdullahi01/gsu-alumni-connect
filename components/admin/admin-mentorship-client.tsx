"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock3,
  GraduationCap,
  MoreHorizontal,
  Search,
  UserCheck2,
  UserX2,
  XCircle,
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

type MentorshipStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED";

type MentorshipRow = {
  id: string;
  subject: string | null;
  message: string | null;
  notes: string | null;
  status: MentorshipStatus;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  mentor: {
    id: string;
    fullName: string;
    registrationNo: string;
    facultyName: string | null;
    departmentName: string | null;
    user: { email: string | null; phone: string | null };
  };
  mentee: {
    id: string;
    fullName: string;
    registrationNo: string;
    facultyName: string | null;
    departmentName: string | null;
    user: { email: string | null; phone: string | null };
  };
};

type Payload = {
  mentorships: MentorshipRow[];
  stats: {
    totalPairs: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
    declined: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const statusClass: Record<MentorshipStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-red-50 text-red-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-slate-100 text-slate-700",
};

export function AdminMentorshipClient() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<Payload | null>(null);
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
      if (query.trim()) params.set("q", query.trim());
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/admin/mentorship?${params.toString()}`);
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load mentorship.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Failed to load mentorship.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, query, status]);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  const runAction = async (id: string, action: "accept" | "decline" | "cancel" | "complete") => {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/mentorship/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Action failed.");
        return;
      }
      await load();
    } catch {
      setError("Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const stats = payload?.stats;
  const rows = payload?.mentorships ?? [];
  const pagination = payload?.pagination;

  const pageLabel = useMemo(() => {
    if (!pagination) return "";
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(pagination.total, pagination.page * pagination.pageSize);
    return `${start}-${end} of ${pagination.total}`;
  }, [pagination]);

  return (
    <>
      <DashboardHeader title="Admin Mentorship" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Mentorship Management</h1>
          <p className="text-sm text-muted-foreground">Monitor all mentorship sessions and moderate status transitions.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats?.totalPairs ?? 0}</p></div><GraduationCap className="size-5 text-primary" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold">{stats?.pending ?? 0}</p></div><Clock3 className="size-5 text-amber-500" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold">{stats?.active ?? 0}</p></div><CheckCircle2 className="size-5 text-emerald-500" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold">{stats?.completed ?? 0}</p></div><UserCheck2 className="size-5 text-blue-500" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Cancelled</p><p className="text-2xl font-bold">{stats?.cancelled ?? 0}</p></div><XCircle className="size-5 text-slate-500" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Declined</p><p className="text-2xl font-bold">{stats?.declined ?? 0}</p></div><UserX2 className="size-5 text-red-500" /></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Search by mentor/mentee names, registration number, or subject.</CardDescription>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search mentorship records" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {loading ? <p className="text-sm text-muted-foreground">Loading mentorship records...</p> : null}
            {!loading && rows.length === 0 ? <p className="text-sm text-muted-foreground">No mentorship records found.</p> : null}

            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusClass[row.status]}>{row.status}</Badge>
                        {row.subject ? <p className="text-sm font-semibold">{row.subject}</p> : <p className="text-sm font-semibold">Mentorship Session</p>}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Mentor: <span className="font-medium text-foreground">{row.mentor.fullName}</span> ({row.mentor.registrationNo})
                        {"  "}
                        Mentee: <span className="font-medium text-foreground">{row.mentee.fullName}</span> ({row.mentee.registrationNo})
                      </p>

                      {row.message ? <p className="text-sm text-muted-foreground">{row.message}</p> : null}

                      <p className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                        {row.acceptedAt ? ` • Accepted ${formatDistanceToNow(new Date(row.acceptedAt), { addSuffix: true })}` : ""}
                        {row.completedAt ? ` • Completed ${formatDistanceToNow(new Date(row.completedAt), { addSuffix: true })}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" disabled={busy === row.id}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/mentorship/${row.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          {row.status === "PENDING" ? (
                            <>
                              <DropdownMenuItem onClick={() => runAction(row.id, "accept")}>Accept</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => runAction(row.id, "decline")}>Decline</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => runAction(row.id, "cancel")}>Cancel</DropdownMenuItem>
                            </>
                          ) : null}
                          {row.status === "ACCEPTED" ? (
                            <>
                              <DropdownMenuItem onClick={() => runAction(row.id, "complete")}>Mark Completed</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => runAction(row.id, "cancel")}>Cancel</DropdownMenuItem>
                            </>
                          ) : null}
                          {row.status !== "PENDING" && row.status !== "ACCEPTED" ? (
                            <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                          ) : null}
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


