"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  Clock3,
  GraduationCap,
  Search,
  Send,
  UserCheck2,
  UserPlus,
  UserX2,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Mentor = {
  id: string;
  fullName: string;
  registrationNo: string;
  departmentName: string | null;
  facultyName: string | null;
  graduationYear: string | null;
  bio: string | null;
  openToOpportunities: boolean;
  availableForMentorship: boolean;
  user: { image: string | null };
  skills: Array<{ skillName: string; proficiency: string }>;
};

type PersonLite = {
  id: string;
  fullName: string;
  registrationNo: string;
  facultyName: string | null;
  departmentName: string | null;
  user: { image: string | null; email: string | null; phone: string | null };
};

type IncomingRequest = {
  id: string;
  subject: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  mentee: PersonLite;
};

type OutgoingRequest = {
  id: string;
  subject: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  mentor: PersonLite;
};

type ActiveAsMentee = {
  id: string;
  subject: string | null;
  message: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
  mentor: PersonLite;
};

type ActiveAsMentor = {
  id: string;
  subject: string | null;
  message: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
  mentee: PersonLite;
};

type Payload = {
  mentors: Mentor[];
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
  activeAsMentee: ActiveAsMentee[];
  activeAsMentor: ActiveAsMentor[];
  stats: {
    mentors: number;
    incoming: number;
    outgoing: number;
    active: number;
  };
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function MentorshipClient() {
  const [tab, setTab] = useState<"find" | "requests" | "active">("find");
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/mentorship?${params.toString()}`);
      const json = (await res.json()) as Payload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load mentorship data.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Unable to load mentorship data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [query]);

  const submitRequest = async () => {
    if (!selectedMentor) return;
    setBusyId(selectedMentor.id);
    setError("");
    try {
      const res = await fetch("/api/mentorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: selectedMentor.id,
          subject: subject || undefined,
          message: message || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to submit request.");
        return;
      }
      setOpenDialog(false);
      setSelectedMentor(null);
      setSubject("");
      setMessage("");
      await load();
      setTab("requests");
    } catch {
      setError("Failed to submit request.");
    } finally {
      setBusyId(null);
    }
  };

  const actionMentorship = async (
    mentorshipId: string,
    action: "accept" | "decline" | "cancel" | "complete",
    notes?: string
  ) => {
    setBusyId(mentorshipId);
    setError("");
    try {
      const res = await fetch(`/api/mentorship/${mentorshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
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

  const incoming = payload?.incoming ?? [];
  const outgoing = payload?.outgoing ?? [];
  const activeAsMentee = payload?.activeAsMentee ?? [];
  const activeAsMentor = payload?.activeAsMentor ?? [];
  const mentors = payload?.mentors ?? [];

  const requestCount = incoming.length + outgoing.length;
  const activeCount = activeAsMentee.length + activeAsMentor.length;

  const canRequestMentor = useMemo(() => {
    const pendingOrActiveMentorIds = new Set<string>();
    outgoing.forEach((o) => pendingOrActiveMentorIds.add(o.mentor.id));
    activeAsMentee.forEach((a) => pendingOrActiveMentorIds.add(a.mentor.id));
    return (mentorId: string) => !pendingOrActiveMentorIds.has(mentorId);
  }, [outgoing, activeAsMentee]);

  return (
    <>
      <DashboardHeader title="Mentorship" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" />
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Mentorship</CardTitle>
            <CardDescription>
              Find mentors, manage requests, and run active mentorship sessions professionally.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Available Mentors</p>
              <p className="text-2xl font-bold">{payload?.stats.mentors ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Incoming</p>
              <p className="text-2xl font-bold">{payload?.stats.incoming ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Outgoing</p>
              <p className="text-2xl font-bold">{payload?.stats.outgoing ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Active Sessions</p>
              <p className="text-2xl font-bold">{payload?.stats.active ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search mentor by name, registration, faculty, department"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={tab} onValueChange={(v) => setTab(v as "find" | "requests" | "active")} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="find" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              Find Mentors ({mentors.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              Requests ({requestCount})
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              Active ({activeCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="find" className="space-y-4">
            {loading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading mentors...</CardContent></Card>
            ) : mentors.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No mentors available now.</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {mentors.map((mentor) => {
                  const disabled = !canRequestMentor(mentor.id);
                  return (
                    <Card key={mentor.id} className="border-border/70">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-11 border">
                            <AvatarImage src={mentor.user.image ?? undefined} alt={mentor.fullName} />
                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                              {initials(mentor.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold">{mentor.fullName}</p>
                            <p className="text-xs text-muted-foreground">{mentor.registrationNo}</p>
                            <p className="text-xs text-muted-foreground">
                              {mentor.facultyName ?? "Faculty"} / {mentor.departmentName ?? "Department"}
                            </p>
                          </div>
                        </div>
                        {mentor.bio ? <p className="line-clamp-2 text-xs text-muted-foreground">{mentor.bio}</p> : null}
                        <div className="flex flex-wrap gap-1.5">
                          {mentor.skills.slice(0, 4).map((s) => (
                            <Badge key={s.skillName} variant="secondary" className="text-[10px]">
                              {s.skillName}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          variant={disabled ? "outline" : "default"}
                          disabled={disabled || busyId === mentor.id}
                          onClick={() => {
                            setSelectedMentor(mentor);
                            setOpenDialog(true);
                          }}
                        >
                          <UserPlus className="mr-1.5 size-3.5" />
                          {disabled ? "Request Sent/Active" : "Request Mentorship"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Incoming Requests</CardTitle>
                  <CardDescription>Requests you need to accept or decline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {incoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No incoming requests.</p>
                  ) : (
                    incoming.map((req) => (
                      <div key={req.id} className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{req.mentee.fullName}</p>
                        <p className="text-xs text-muted-foreground">{req.mentee.registrationNo}</p>
                        {req.subject ? <p className="mt-1 text-xs font-medium">{req.subject}</p> : null}
                        {req.message ? <p className="mt-1 text-xs text-muted-foreground">{req.message}</p> : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" disabled={busyId === req.id} onClick={() => void actionMentorship(req.id, "accept")}>
                            <Check className="mr-1 size-3.5" />
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" disabled={busyId === req.id} onClick={() => void actionMentorship(req.id, "decline")}>
                            <UserX2 className="mr-1 size-3.5" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Outgoing Requests</CardTitle>
                  <CardDescription>Requests you have sent to mentors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {outgoing.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No outgoing requests.</p>
                  ) : (
                    outgoing.map((req) => (
                      <div key={req.id} className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{req.mentor.fullName}</p>
                        <p className="text-xs text-muted-foreground">{req.mentor.registrationNo}</p>
                        {req.subject ? <p className="mt-1 text-xs font-medium">{req.subject}</p> : null}
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary"><Clock3 className="mr-1 size-3.5" />Pending</Badge>
                        </div>
                        <div className="mt-2">
                          <Button size="sm" variant="outline" disabled={busyId === req.id} onClick={() => void actionMentorship(req.id, "cancel")}>
                            Cancel Request
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">My Mentors</CardTitle>
                  <CardDescription>Accepted mentorships where you are mentee.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeAsMentee.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active mentorships as mentee.</p>
                  ) : (
                    activeAsMentee.map((m) => (
                      <div key={m.id} className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{m.mentor.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.mentor.registrationNo}</p>
                        {m.subject ? <p className="mt-1 text-xs font-medium">{m.subject}</p> : null}
                        <Badge variant="secondary" className="mt-2">
                          <UserCheck2 className="mr-1 size-3.5" />
                          Active
                        </Badge>
                        <div className="mt-2">
                          <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => void actionMentorship(m.id, "cancel")}>
                            End Session
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">My Mentees</CardTitle>
                  <CardDescription>Accepted mentorships where you are mentor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeAsMentor.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active mentees currently.</p>
                  ) : (
                    activeAsMentor.map((m) => (
                      <div key={m.id} className="rounded-lg border p-3">
                        <p className="text-sm font-semibold">{m.mentee.fullName}</p>
                        <p className="text-xs text-muted-foreground">{m.mentee.registrationNo}</p>
                        {m.subject ? <p className="mt-1 text-xs font-medium">{m.subject}</p> : null}
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" disabled={busyId === m.id} onClick={() => void actionMentorship(m.id, "complete")}>
                            <GraduationCap className="mr-1 size-3.5" />
                            Mark Complete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Mentorship</DialogTitle>
              <DialogDescription>
                Send a professional mentorship request to {selectedMentor?.fullName ?? "mentor"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Career transition guidance" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Briefly explain your goals and what support you need."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button onClick={() => void submitRequest()} disabled={!selectedMentor || busyId === selectedMentor.id}>
                <Send className="mr-1.5 size-4" />
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
