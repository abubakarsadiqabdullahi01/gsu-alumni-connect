"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock3, Search, ShieldCheck, Trash2, Trophy, Undo2 } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ModerationItem = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  graduateId: string;
  graduate: {
    id: string;
    fullName: string;
    registrationNo: string;
    facultyName: string | null;
    departmentName: string | null;
    graduationYear: string | null;
    user: {
      email: string | null;
      phone: string | null;
    };
  };
};

type Payload = {
  achievements: ModerationItem[];
  stats: {
    pending: number;
    verified: number;
    total: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export default function AdminAchievementsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      params.set("page", String(page));
      params.set("pageSize", "10");
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/achievements?${params.toString()}`);
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load moderation queue.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Unable to load moderation queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, search, status]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const moderationAction = async (id: string, action: "verify" | "unverify" | "reject") => {
    if (action === "reject") {
      const ok = window.confirm("Reject and remove this achievement?");
      if (!ok) return;
    }

    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/achievements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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

  return (
    <>
      <DashboardHeader title="Achievements Moderation" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Achievements Review Queue</CardTitle>
            <CardDescription>
              Verify or reject user-submitted achievements with full alumni context.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <Clock3 className="size-5 text-primary" />
                {payload?.stats.pending ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <ShieldCheck className="size-5 text-primary" />
                {payload?.stats.verified ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <Trophy className="size-5 text-primary" />
                {payload?.stats.total ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by title, description, name, registration"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading moderation queue...</CardContent>
          </Card>
        ) : !payload || payload.achievements.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No achievements found for this filter.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payload.achievements.map((item) => (
              <Card key={item.id} className="border-border/70">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{item.title}</p>
                        {item.verified ? (
                          <Badge className="bg-emerald-50 text-emerald-700">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                        {item.year ? <Badge variant="secondary">{item.year}</Badge> : null}
                      </div>

                      {item.description ? (
                        <p className="mt-2 text-xs text-muted-foreground">{item.description}</p>
                      ) : null}

                      <div className="mt-2 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">{item.graduate.fullName}</p>
                        <p>{item.graduate.registrationNo}</p>
                        <p>
                          {item.graduate.facultyName ?? "Faculty"} / {item.graduate.departmentName ?? "Department"}
                          {item.graduate.graduationYear ? ` - ${item.graduate.graduationYear}` : ""}
                        </p>
                        {item.graduate.user.email ? <p>{item.graduate.user.email}</p> : null}
                      </div>

                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Submitted {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        {item.verifiedAt ? ` - Verified on ${new Date(item.verifiedAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!item.verified ? (
                        <Button
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => void moderationAction(item.id, "verify")}
                        >
                          <CheckCircle2 className="mr-1 size-3.5" />
                          Verify
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === item.id}
                          onClick={() => void moderationAction(item.id, "unverify")}
                        >
                          <Undo2 className="mr-1 size-3.5" />
                          Unverify
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void moderationAction(item.id, "reject")}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-xs text-muted-foreground">
              Page {payload?.pagination.page ?? 1} of {payload?.pagination.totalPages ?? 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={(payload?.pagination.page ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(payload?.pagination.page ?? 1) >= (payload?.pagination.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
