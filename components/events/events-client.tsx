"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarCheck2,
  CalendarDays,
  CalendarX2,
  Clock3,
  MapPin,
  Plus,
  Search,
  Ticket,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  type: "REUNION" | "MEETUP" | "WORKSHOP" | "NETWORKING" | "WEBINAR";
  location: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  isPublic: boolean;
  isCancelled: boolean;
  createdAt: string;
  attendeesCount: number;
  joined: boolean;
  isMine: boolean;
  creator: {
    fullName: string;
    registrationNo: string;
    departmentName: string | null;
  };
};

type MyEvent = {
  id: string;
  title: string;
  description: string | null;
  type: EventItem["type"];
  location: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  isPublic: boolean;
  isCancelled: boolean;
  createdAt: string;
  attendeesCount: number;
  attendees: Array<{
    id: string;
    createdAt: string;
    graduate: {
      fullName: string;
      registrationNo: string;
      departmentName: string | null;
      facultyName: string | null;
      user: {
        email: string | null;
        phone: string | null;
      };
    };
  }>;
};

type RsvpRow = {
  eventId: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    type: EventItem["type"];
    startsAt: string;
    location: string;
    isCancelled: boolean;
    creator: { fullName: string };
  };
};

type EventsPayload = {
  events: EventItem[];
  myEvents: MyEvent[];
  myRsvps: RsvpRow[];
  stats: {
    total: number;
    upcoming: number;
    mine: number;
    joined: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const typeBadgeClass: Record<EventItem["type"], string> = {
  REUNION: "bg-purple-50 text-purple-700",
  MEETUP: "bg-blue-50 text-blue-700",
  WORKSHOP: "bg-amber-50 text-amber-700",
  NETWORKING: "bg-emerald-50 text-emerald-700",
  WEBINAR: "bg-cyan-50 text-cyan-700",
};

export function EventsClient() {
  const [tab, setTab] = useState<"browse" | "mine" | "joined">("browse");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<EventsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [myPage, setMyPage] = useState(1);
  const [joinedPage, setJoinedPage] = useState(1);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "MEETUP",
    location: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
  });

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "10");
      params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      const res = await fetch(`/api/events?${params.toString()}`);
      const json = (await res.json()) as EventsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load events.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Unable to load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  const rsvp = async (eventId: string, joined: boolean) => {
    setBusyId(eventId);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
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

  const setCancelState = async (eventId: string, action: "cancel" | "reopen") => {
    setBusyId(eventId);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to update event.");
        return;
      }
      await load();
    } catch {
      setError("Failed to update event.");
    } finally {
      setBusyId(null);
    }
  };

  const createEvent = async () => {
    setError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          type: form.type,
          location: form.location,
          startsAt: form.startsAt,
          endsAt: form.endsAt || undefined,
          capacity: form.capacity ? Number(form.capacity) : undefined,
          isPublic: true,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to create event.");
        return;
      }
      setForm({
        title: "",
        description: "",
        type: "MEETUP",
        location: "",
        startsAt: "",
        endsAt: "",
        capacity: "",
      });
      setOpenCreate(false);
      await load();
      setTab("mine");
    } catch {
      setError("Failed to create event.");
    }
  };

  const myEvents = payload?.myEvents ?? [];
  const joined = payload?.myRsvps ?? [];
  const tabPageSize = 6;
  const myTotalPages = Math.max(1, Math.ceil(myEvents.length / tabPageSize));
  const joinedTotalPages = Math.max(1, Math.ceil(joined.length / tabPageSize));
  const visibleMyEvents = useMemo(() => myEvents.slice((myPage - 1) * tabPageSize, myPage * tabPageSize), [myEvents, myPage]);
  const visibleJoined = useMemo(() => joined.slice((joinedPage - 1) * tabPageSize, joinedPage * tabPageSize), [joined, joinedPage]);

  return (
    <>
      <DashboardHeader title="Events" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Alumni Events</CardTitle>
              <CardDescription>
                Discover upcoming reunions and workshops, RSVP instantly, and manage your own events.
              </CardDescription>
            </div>
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 size-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                  <DialogDescription>Publish a new alumni event with schedule and location.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REUNION">Reunion</SelectItem>
                        <SelectItem value="MEETUP">Meetup</SelectItem>
                        <SelectItem value="WORKSHOP">Workshop</SelectItem>
                        <SelectItem value="NETWORKING">Networking</SelectItem>
                        <SelectItem value="WEBINAR">Webinar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Capacity</Label>
                    <Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Location</Label>
                    <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Starts At</Label>
                    <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Ends At</Label>
                    <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                  <Button onClick={createEvent} disabled={!form.title.trim() || !form.location.trim() || !form.startsAt}>Publish Event</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Browse Total</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold"><CalendarDays className="size-5 text-primary" />{payload?.stats.total ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Upcoming</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold"><CalendarCheck2 className="size-5 text-primary" />{payload?.stats.upcoming ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">My Events</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold"><Ticket className="size-5 text-primary" />{payload?.stats.mine ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold"><Users className="size-5 text-primary" />{payload?.stats.joined ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={tab} onValueChange={(v) => setTab(v as "browse" | "mine" | "joined")} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="browse" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">Browse ({payload?.pagination.total ?? 0})</TabsTrigger>
            <TabsTrigger value="mine" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">My Events ({myEvents.length})</TabsTrigger>
            <TabsTrigger value="joined" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">Joined ({joined.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search event title, description, location" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Event Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="REUNION">Reunion</SelectItem>
                  <SelectItem value="MEETUP">Meetup</SelectItem>
                  <SelectItem value="WORKSHOP">Workshop</SelectItem>
                  <SelectItem value="NETWORKING">Networking</SelectItem>
                  <SelectItem value="WEBINAR">Webinar</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading events...</CardContent></Card>
            ) : !payload || payload.events.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No events found.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {payload.events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={typeBadgeClass[event.type]}>{event.type}</Badge>
                            {event.isCancelled ? <Badge variant="destructive"><CalendarX2 className="mr-1 size-3.5" />Cancelled</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm font-bold">{event.title}</p>
                          <p className="text-xs text-muted-foreground">By {event.creator.fullName}</p>
                          {event.description ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{event.description}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{event.location}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{new Date(event.startsAt).toLocaleString()}</span>
                            <span className="inline-flex items-center gap-1"><Users className="size-3" />{event.attendeesCount} joined</span>
                            {event.capacity ? <span>Capacity {event.capacity}</span> : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {event.isMine ? (
                            <Badge variant="outline">My Event</Badge>
                          ) : (
                            <Button size="sm" variant={event.joined ? "outline" : "default"} disabled={busyId === event.id || event.isCancelled} onClick={() => void rsvp(event.id, event.joined)}>
                              {busyId === event.id ? "Processing..." : event.joined ? "Cancel RSVP" : "RSVP"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-xs text-muted-foreground">Page {payload?.pagination.page ?? 1} of {payload?.pagination.totalPages ?? 1}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={(payload?.pagination.page ?? 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={(payload?.pagination.page ?? 1) >= (payload?.pagination.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mine" className="space-y-3">
            {visibleMyEvents.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">You have not created any events yet.</CardContent></Card>
            ) : (
              visibleMyEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(event.startsAt).toLocaleString()} - {event.location}</p>
                      </div>
                      <div className="flex gap-2">
                        {event.isCancelled ? (
                          <Button size="sm" variant="outline" disabled={busyId === event.id} onClick={() => void setCancelState(event.id, "reopen")}>Reopen</Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled={busyId === event.id} onClick={() => void setCancelState(event.id, "cancel")}>Cancel</Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium">{event.attendeesCount} attendees</p>
                    <div className="space-y-2">
                      {event.attendees.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No attendees yet.</p>
                      ) : (
                        event.attendees.slice(0, 6).map((a) => (
                          <div key={a.id} className="rounded-md border p-2 text-xs">
                            <p className="font-semibold">{a.graduate.fullName}</p>
                            <p className="text-muted-foreground">{a.graduate.registrationNo} - {a.graduate.facultyName ?? "Faculty"} / {a.graduate.departmentName ?? "Department"}</p>
                            {a.graduate.user.email ? <p className="text-muted-foreground">{a.graduate.user.email}</p> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-xs text-muted-foreground">Page {myPage} of {myTotalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={myPage <= 1} onClick={() => setMyPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={myPage >= myTotalPages} onClick={() => setMyPage((p) => Math.min(myTotalPages, p + 1))}>Next</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="joined" className="space-y-3">
            {visibleJoined.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No RSVPs yet.</CardContent></Card>
            ) : (
              visibleJoined.map((row) => (
                <Card key={row.eventId}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">{row.event.title}</p>
                      <p className="text-xs text-muted-foreground">Hosted by {row.event.creator.fullName} - {row.event.location}</p>
                      <p className="text-xs text-muted-foreground">Starts {formatDistanceToNow(new Date(row.event.startsAt), { addSuffix: true })}</p>
                    </div>
                    <Badge variant={row.event.isCancelled ? "destructive" : "secondary"}>{row.event.isCancelled ? "Cancelled" : "Joined"}</Badge>
                  </CardContent>
                </Card>
              ))
            )}
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-xs text-muted-foreground">Page {joinedPage} of {joinedTotalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={joinedPage <= 1} onClick={() => setJoinedPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={joinedPage >= joinedTotalPages} onClick={() => setJoinedPage((p) => Math.min(joinedTotalPages, p + 1))}>Next</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
