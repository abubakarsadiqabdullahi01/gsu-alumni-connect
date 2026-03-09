"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BriefcaseBusiness,
  Briefcase,
  CheckCircle2,
  Layers3,
  MessageSquare,
  PartyPopper,
  Plus,
  RefreshCw,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type FeedItem = {
  id: string;
  actionType: string;
  headline: string;
  isPublic: boolean;
  createdAt: string;
  graduateId: string;
  graduate: {
    fullName: string;
    departmentName: string | null;
    user: { image: string | null };
  };
};

type FeedClientProps = {
  initialItems: FeedItem[];
  currentGraduateId: string;
  canViewAll: boolean;
};

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  JOINED_PLATFORM: { icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50", label: "New Member" },
  UPDATED_JOB: { icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", label: "Career Update" },
  JOINED_GROUP: { icon: UsersRound, color: "text-violet-600", bg: "bg-violet-50", label: "Group Activity" },
  POSTED_IN_GROUP: { icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50", label: "Group Post" },
  POSTED_JOB: { icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50", label: "Job Posting" },
  PROFILE_COMPLETED: { icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50", label: "Milestone" },
  GRADUATION_ANNIVERSARY: { icon: PartyPopper, color: "text-amber-600", bg: "bg-amber-50", label: "Milestone" },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function timeAgo(dateISO: string) {
  const date = new Date(dateISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function FeedClient({ initialItems, currentGraduateId, canViewAll }: FeedClientProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [headline, setHeadline] = useState("");
  const [actionType, setActionType] = useState("POSTED_IN_GROUP");
  const [isPublic, setIsPublic] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [allPage, setAllPage] = useState(1);
  const allPageSize = 8;

  const filtered = useMemo(() => {
    const jobs = new Set(["POSTED_JOB", "UPDATED_JOB"]);
    const groups = new Set(["JOINED_GROUP", "POSTED_IN_GROUP"]);
    return {
      all: items,
      jobs: items.filter((item) => jobs.has(item.actionType)),
      groups: items.filter((item) => groups.has(item.actionType)),
      mine: items.filter((item) => item.graduateId === currentGraduateId),
    };
  }, [items, currentGraduateId]);

  const allTotalPages = Math.max(1, Math.ceil(filtered.all.length / allPageSize));
  const paginatedAll = useMemo(() => {
    const start = (allPage - 1) * allPageSize;
    return filtered.all.slice(start, start + allPageSize);
  }, [filtered.all, allPage]);

  const publish = async () => {
    setError("");
    setIsPosting(true);
    try {
      const res = await fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline, actionType, isPublic }),
      });
      const result = (await res.json()) as { error?: string; item?: FeedItem };
      if (!res.ok || !result.item) {
        setError(result.error ?? "Failed to publish update.");
        return;
      }
      setItems((prev) => [result.item!, ...prev]);
      setAllPage(1);
      setHeadline("");
    } catch {
      setError("Something went wrong while posting.");
    } finally {
      setIsPosting(false);
    }
  };

  const refresh = async () => {
    setError("");
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/feed", { method: "GET" });
      const result = (await res.json()) as { error?: string; feed?: FeedItem[] };
      if (!res.ok || !result.feed) {
        setError(result.error ?? "Failed to refresh feed.");
        return;
      }
      setItems(result.feed);
      setAllPage(1);
    } catch {
      setError("Unable to refresh feed.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const mineOnly = filtered.mine;

  return (
    <>
      <DashboardHeader title="Activity Feed" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              Share an Update
            </CardTitle>
            <CardDescription>Post career, group, or milestone updates to your alumni network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Example: I started a new role as Product Analyst at Access Bank."
              className="min-h-24 resize-none"
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select update type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPDATED_JOB">Career Update</SelectItem>
                  <SelectItem value="POSTED_JOB">Job Posting</SelectItem>
                  <SelectItem value="JOINED_GROUP">Joined Group</SelectItem>
                  <SelectItem value="POSTED_IN_GROUP">Group Post</SelectItem>
                  <SelectItem value="GRADUATION_ANNIVERSARY">Milestone</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>Public</span>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <Button onClick={publish} disabled={isPosting || headline.trim().length < 8}>
                {isPosting ? "Posting..." : "Post Update"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {canViewAll ? (
          <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1 md:grid-cols-4">
              <TabsTrigger
                value="all"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
              >
                <Layers3 className="size-3.5" />
                <span>All</span>
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                  {filtered.all.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="jobs"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
              >
                <BriefcaseBusiness className="size-3.5" />
                <span>Jobs</span>
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                  {filtered.jobs.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
              >
                <UsersRound className="size-3.5" />
                <span>Groups</span>
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                  {filtered.groups.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="mine"
                className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
              >
                <UserRound className="size-3.5" />
                <span>My Updates</span>
                <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                  {filtered.mine.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {(["all", "jobs", "groups", "mine"] as const).map((key) => (
            <TabsContent key={key} value={key} className="space-y-3">
              {(key === "all" ? paginatedAll.length === 0 : filtered[key].length === 0) ? (
                <Card>
                  <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Activity className="size-4" />
                    No activity available in this view yet.
                  </CardContent>
                </Card>
              ) : (
                (key === "all" ? paginatedAll : filtered[key]).map((item, idx) => {
                  const cfg = typeConfig[item.actionType] ?? typeConfig.JOINED_PLATFORM;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                    >
                      <Card className="overflow-hidden border-border/70">
                        <CardContent className="flex gap-3 p-4">
                          <div className="relative shrink-0">
                            <Avatar className="size-11 border">
                              <AvatarImage src={item.graduate.user.image ?? undefined} alt={item.graduate.fullName} />
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {initials(item.graduate.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 rounded-full p-1 ${cfg.bg}`}>
                              <Icon className={`size-3 ${cfg.color}`} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-relaxed">
                              <span className="font-semibold">{item.graduate.fullName}</span>{" "}
                              <span className="text-muted-foreground">{item.headline}</span>
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {cfg.label}
                              </Badge>
                              {item.graduate.departmentName ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {item.graduate.departmentName}
                                </Badge>
                              ) : null}
                              <span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                              {!item.isPublic ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Private
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}

              {key === "all" && filtered.all.length > allPageSize ? (
                <Card>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Showing {(allPage - 1) * allPageSize + 1}-
                      {Math.min(allPage * allPageSize, filtered.all.length)} of {filtered.all.length} activities
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={allPage <= 1}
                        onClick={() => setAllPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Badge variant="secondary" className="min-w-20 justify-center">
                        Page {allPage} / {allTotalPages}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={allPage >= allTotalPages}
                        onClick={() => setAllPage((p) => Math.min(allTotalPages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
          ))}
          </Tabs>
        ) : (
          <div className="space-y-3">
            {mineOnly.length === 0 ? (
              <Card>
                <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                  <Activity className="size-4" />
                  No personal activity yet. Share your first update.
                </CardContent>
              </Card>
            ) : (
              mineOnly.map((item, idx) => {
                const cfg = typeConfig[item.actionType] ?? typeConfig.JOINED_PLATFORM;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                  >
                    <Card className="overflow-hidden border-border/70">
                      <CardContent className="flex gap-3 p-4">
                        <div className="relative shrink-0">
                          <Avatar className="size-11 border">
                            <AvatarImage src={item.graduate.user.image ?? undefined} alt={item.graduate.fullName} />
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {initials(item.graduate.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 rounded-full p-1 ${cfg.bg}`}>
                            <Icon className={`size-3 ${cfg.color}`} />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-relaxed">
                            <span className="font-semibold">{item.graduate.fullName}</span>{" "}
                            <span className="text-muted-foreground">{item.headline}</span>
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {cfg.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                            {!item.isPublic ? (
                              <Badge variant="outline" className="text-[10px]">
                                Private
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
