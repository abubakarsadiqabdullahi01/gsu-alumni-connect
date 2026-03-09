"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Award,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Pencil,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Achievement = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
};

type BadgeItem = {
  badgeType:
    | "PROFILE_COMPLETE"
    | "EARLY_ADOPTER"
    | "FIRST_CLASS_HONOURS"
    | "MENTOR"
    | "JOB_POSTER"
    | "TOP_CONNECTOR"
    | "VERIFIED";
  label: string;
  description: string;
  icon: "shield-check" | "rocket" | "award" | "graduation-cap" | "briefcase" | "users" | "badge-check";
  locked: boolean;
  awardedAt: string | null;
};

type Payload = {
  achievements: Achievement[];
  badges: BadgeItem[];
  stats: {
    totalAchievements: number;
    verifiedAchievements: number;
    pendingAchievements: number;
    earnedBadges: number;
    lockedBadges: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const badgeIcons = {
  "shield-check": ShieldCheck,
  rocket: Rocket,
  award: Award,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  users: Users,
  "badge-check": BadgeCheck,
};

const badgeColors: Record<BadgeItem["badgeType"], string> = {
  PROFILE_COMPLETE: "from-emerald-500 to-teal-600",
  EARLY_ADOPTER: "from-violet-500 to-indigo-600",
  FIRST_CLASS_HONOURS: "from-amber-500 to-yellow-500",
  MENTOR: "from-blue-500 to-cyan-600",
  JOB_POSTER: "from-orange-500 to-red-600",
  TOP_CONNECTOR: "from-pink-500 to-rose-600",
  VERIFIED: "from-sky-500 to-blue-600",
};

export function AchievementsClient() {
  const [tab, setTab] = useState<"achievements" | "badges">("achievements");
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    year: "",
  });

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "10");
      params.set("verified", verifiedFilter);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/achievements?${params.toString()}`);
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load achievements.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Unable to load achievements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, search, verifiedFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, verifiedFilter]);

  const createAchievement = async () => {
    setError("");
    setBusyId("create");
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          year: form.year ? Number(form.year) : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to create achievement.");
        return;
      }
      setForm({ title: "", description: "", year: "" });
      setOpenCreate(false);
      await load();
    } catch {
      setError("Failed to create achievement.");
    } finally {
      setBusyId(null);
    }
  };

  const updateAchievement = async () => {
    if (!editing) return;
    setError("");
    setBusyId(editing.id);
    try {
      const res = await fetch(`/api/achievements/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          year: form.year ? Number(form.year) : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to update achievement.");
        return;
      }
      setOpenEdit(false);
      setEditing(null);
      setForm({ title: "", description: "", year: "" });
      await load();
    } catch {
      setError("Failed to update achievement.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteAchievement = async (id: string) => {
    const ok = window.confirm("Delete this achievement?");
    if (!ok) return;

    setError("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/achievements/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to delete achievement.");
        return;
      }
      await load();
    } catch {
      setError("Failed to delete achievement.");
    } finally {
      setBusyId(null);
    }
  };

  const openEditDialog = (achievement: Achievement) => {
    setEditing(achievement);
    setForm({
      title: achievement.title,
      description: achievement.description ?? "",
      year: achievement.year ? String(achievement.year) : "",
    });
    setOpenEdit(true);
  };

  const badges = payload?.badges ?? [];
  const earnedBadges = useMemo(() => badges.filter((b) => !b.locked), [badges]);
  const badgeProgress = badges.length ? (earnedBadges.length / badges.length) * 100 : 0;

  return (
    <>
      <DashboardHeader title="Achievements" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Achievements</CardTitle>
              <CardDescription>
                Showcase your accomplishments and track badges earned across the platform.
              </CardDescription>
            </div>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="mr-1.5 size-4" />
              Add Achievement
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-5">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <Trophy className="size-5 text-primary" />
                {payload?.stats.totalAchievements ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <CheckCircle2 className="size-5 text-primary" />
                {payload?.stats.verifiedAchievements ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <Clock3 className="size-5 text-primary" />
                {payload?.stats.pendingAchievements ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Badges Earned</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <Award className="size-5 text-primary" />
                {payload?.stats.earnedBadges ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Badges Locked</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
                <Star className="size-5 text-primary" />
                {payload?.stats.lockedBadges ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={tab} onValueChange={(v) => setTab(v as "achievements" | "badges")} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="achievements" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              My Achievements ({payload?.stats.totalAchievements ?? 0})
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              Badge Gallery ({payload?.stats.earnedBadges ?? 0}/{badges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by title or description"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">Loading achievements...</CardContent>
              </Card>
            ) : !payload || payload.achievements.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No achievements found. Add your first achievement to build your profile.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {payload.achievements.map((achievement) => (
                  <Card key={achievement.id} className="border-border/70 transition-shadow hover:shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{achievement.title}</p>
                          {achievement.verified ? (
                            <Badge className="bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock3 className="mr-1 size-3.5" />
                              Pending
                            </Badge>
                          )}
                          {achievement.year ? <Badge variant="secondary">{achievement.year}</Badge> : null}
                        </div>
                        {achievement.description ? (
                          <p className="mt-2 text-xs text-muted-foreground">{achievement.description}</p>
                        ) : null}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Added {formatDistanceToNow(new Date(achievement.createdAt), { addSuffix: true })}
                          {achievement.verifiedAt
                            ? ` - Verified on ${new Date(achievement.verifiedAt).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={achievement.verified || busyId === achievement.id}
                          onClick={() => openEditDialog(achievement)}
                        >
                          <Pencil className="mr-1 size-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={achievement.verified || busyId === achievement.id}
                          onClick={() => void deleteAchievement(achievement.id)}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Delete
                        </Button>
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
          </TabsContent>

          <TabsContent value="badges" className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Badge Progress</p>
                  <p className="text-xs text-muted-foreground">
                    {earnedBadges.length}/{badges.length} earned
                  </p>
                </div>
                <Progress value={badgeProgress} />
              </CardContent>
            </Card>

            {badges.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">No badge data yet.</CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {badges.map((badge) => {
                  const Icon = badgeIcons[badge.icon] ?? Award;
                  const locked = badge.locked;

                  return (
                    <Card key={badge.badgeType} className={locked ? "opacity-70" : ""}>
                      <CardContent className="flex items-start gap-3 p-4">
                        <div
                          className={`flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${
                            locked ? "from-slate-300 to-slate-400" : badgeColors[badge.badgeType]
                          }`}
                        >
                          <Icon className="size-6 text-white" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold">{badge.label}</p>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                          {locked ? (
                            <Badge variant="outline" className="mt-1">Locked</Badge>
                          ) : (
                            <Badge className="mt-1 bg-emerald-50 text-emerald-700">Earned</Badge>
                          )}
                          {badge.awardedAt ? (
                            <p className="text-[11px] text-muted-foreground">
                              Awarded on {new Date(badge.awardedAt).toLocaleDateString()}
                            </p>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Achievement</DialogTitle>
              <DialogDescription>Add a real accomplishment to your profile timeline.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  placeholder="e.g. 2025"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe this achievement clearly."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button onClick={createAchievement} disabled={!form.title.trim() || busyId === "create"}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Achievement</DialogTitle>
              <DialogDescription>Update achievement details before verification.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                  placeholder="e.g. 2025"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe this achievement clearly."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>
                Cancel
              </Button>
              <Button onClick={updateAchievement} disabled={!form.title.trim() || !editing || busyId === editing.id}>
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}


