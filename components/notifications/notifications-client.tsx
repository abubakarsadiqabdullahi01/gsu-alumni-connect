"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Award,
  Bell,
  Briefcase,
  Check,
  Eye,
  GraduationCap,
  Handshake,
  Megaphone,
  MessageCircle,
  Search,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type Payload = {
  notifications: NotificationItem[];
  stats: {
    unread: number;
    read: number;
    total: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const typeIcons: Record<string, React.ElementType> = {
  CONNECTION_REQUEST: Handshake,
  CONNECTION_ACCEPTED: Handshake,
  JOB_MATCH: Briefcase,
  ENDORSEMENT: Award,
  GROUP_POST: Users,
  MESSAGE_RECEIVED: MessageCircle,
  MENTORSHIP_REQUEST: GraduationCap,
  MENTORSHIP_ACCEPTED: GraduationCap,
  PROFILE_VIEW: Eye,
  ADMIN_BROADCAST: Megaphone,
};

const typeColors: Record<string, string> = {
  CONNECTION_REQUEST: "bg-blue-500/10 text-blue-600",
  CONNECTION_ACCEPTED: "bg-emerald-500/10 text-emerald-600",
  JOB_MATCH: "bg-amber-500/10 text-amber-600",
  ENDORSEMENT: "bg-purple-500/10 text-purple-600",
  GROUP_POST: "bg-teal-500/10 text-teal-600",
  MESSAGE_RECEIVED: "bg-rose-500/10 text-rose-600",
  MENTORSHIP_REQUEST: "bg-indigo-500/10 text-indigo-600",
  MENTORSHIP_ACCEPTED: "bg-emerald-500/10 text-emerald-600",
  PROFILE_VIEW: "bg-orange-500/10 text-orange-600",
  ADMIN_BROADCAST: "bg-red-500/10 text-red-600",
};

type NotificationsClientProps = {
  title?: string;
  description?: string;
  apiBase?: string;
};

export function NotificationsClient({
  title = "Notifications",
  description = "Track account activity, messages, mentorship, and system updates.",
  apiBase = "/api/notifications",
}: NotificationsClientProps) {
  const [tab, setTab] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");
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
      params.set("status", tab);
      params.set("page", String(page));
      params.set("pageSize", "12");
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`${apiBase}?${params.toString()}`);
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load notifications.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab, page, search, apiBase]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const markAllRead = async () => {
    setBusyId("mark-all");
    setError("");
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to update notifications.");
        return;
      }
      await load();
    } catch {
      setError("Failed to update notifications.");
    } finally {
      setBusyId(null);
    }
  };

  const markOneRead = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to update notification.");
        return;
      }
      await load();
    } catch {
      setError("Failed to update notification.");
    } finally {
      setBusyId(null);
    }
  };

  const notifications = payload?.notifications ?? [];
  const unreadCount = payload?.stats.unread ?? 0;
  const readCount = payload?.stats.read ?? 0;
  const totalCount = payload?.stats.total ?? 0;

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  return (
    <>
      <DashboardHeader title={title} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500" />
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button variant="outline" onClick={() => void markAllRead()} disabled={!hasUnread || busyId === "mark-all"}>
              <Check className="mr-1.5 size-4" />
              Mark All Read
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-bold">{totalCount}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Unread</p>
              <p className="mt-1 text-2xl font-bold">{unreadCount}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Read</p>
              <p className="mt-1 text-2xl font-bold">{readCount}</p>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search notification title or body"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread" | "read")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading notifications...</CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No notifications in this view.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              return (
                <Card key={n.id} className={n.isRead ? "border-border/60" : "border-primary/20 bg-primary/[0.02]"}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                          typeColors[n.type] ?? "bg-muted"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{n.title}</p>
                          {!n.isRead ? <Badge className="bg-primary/10 text-primary">New</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!n.isRead ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === n.id}
                          onClick={() => void markOneRead(n.id)}
                        >
                          Mark Read
                        </Button>
                      ) : null}
                      {n.actionUrl ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!n.isRead) {
                              void markOneRead(n.id);
                            }
                            window.location.href = n.actionUrl!;
                          }}
                        >
                          Open
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-xs text-muted-foreground">
              Page {payload?.pagination.page ?? 1} of {payload?.pagination.totalPages ?? 1}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={(payload?.pagination.page ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
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
