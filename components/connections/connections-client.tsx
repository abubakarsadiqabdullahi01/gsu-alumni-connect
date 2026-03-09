"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Clock3,
  Compass,
  Handshake,
  Inbox,
  Search,
  ShieldMinus,
  UserCheck2,
  UserCheck,
  UserPlus,
  UserRoundX,
  Users2,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Person = {
  graduateId: string;
  fullName: string;
  registrationNo: string;
  departmentName: string | null;
  facultyName: string | null;
  graduationYear: string | null;
  bio: string | null;
  image: string | null;
};

type ConnectionItem = {
  connectionId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";
  createdAt: string;
  updatedAt: string;
  person: Person;
};

type SuggestionItem = {
  person: Person;
  relevance: number;
  openToOpportunities: boolean;
  availableForMentorship: boolean;
};

type ConnectionsPayload = {
  accepted: ConnectionItem[];
  incoming: ConnectionItem[];
  outgoing: ConnectionItem[];
  suggestions: SuggestionItem[];
  stats: {
    accepted: number;
    incoming: number;
    outgoing: number;
  };
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function matchSearch(person: Person, q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return (
    person.fullName.toLowerCase().includes(term) ||
    person.registrationNo.toLowerCase().includes(term) ||
    (person.departmentName ?? "").toLowerCase().includes(term) ||
    (person.facultyName ?? "").toLowerCase().includes(term)
  );
}

export function ConnectionsClient() {
  const [data, setData] = useState<ConnectionsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = async () => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/connections");
      const json = (await res.json()) as ConnectionsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load connections.");
        return;
      }
      setData(json);
    } catch {
      setError("Unable to load connections.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return null;
    return {
      accepted: data.accepted.filter((x) => matchSearch(x.person, search)),
      incoming: data.incoming.filter((x) => matchSearch(x.person, search)),
      outgoing: data.outgoing.filter((x) => matchSearch(x.person, search)),
      suggestions: data.suggestions.filter((x) => matchSearch(x.person, search)),
    };
  }, [data, search]);

  const runAction = async (connectionId: string, action: "accept" | "decline" | "cancel" | "block" | "remove") => {
    setError("");
    setBusyId(connectionId);
    try {
      const res =
        action === "remove"
          ? await fetch(`/api/connections/${connectionId}`, { method: "DELETE" })
          : await fetch(`/api/connections/${connectionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Action failed.");
        return;
      }
      await loadData();
    } catch {
      setError("Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const sendRequest = async (graduateId: string) => {
    setError("");
    setBusyId(graduateId);
    try {
      const res = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverGraduateId: graduateId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Unable to send request.");
        return;
      }
      await loadData();
    } catch {
      setError("Unable to send request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <DashboardHeader title="Connections" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Connections</CardTitle>
            <CardDescription>
              Manage your alumni network with requests, accepted connections, and smart suggestions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Connected</p>
              <p className="text-2xl font-bold">{data?.stats.accepted ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Incoming Requests</p>
              <p className="text-2xl font-bold">{data?.stats.incoming ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Outgoing Requests</p>
              <p className="text-2xl font-bold">{data?.stats.outgoing ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            placeholder="Search by name, registration number, department, or faculty"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="accepted" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1 md:grid-cols-4">
            <TabsTrigger
              value="accepted"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
            >
              <UserCheck2 className="size-3.5" />
              <span>Accepted</span>
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                {filtered?.accepted.length ?? 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="incoming"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
            >
              <Inbox className="size-3.5" />
              <span>Incoming</span>
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                {filtered?.incoming.length ?? 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="outgoing"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
            >
              <Handshake className="size-3.5" />
              <span>Outgoing</span>
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                {filtered?.outgoing.length ?? 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
            >
              <Compass className="size-3.5" />
              <span>Suggestions</span>
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                {filtered?.suggestions.length ?? 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accepted" className="space-y-3">
            {isLoading || !filtered ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading connections...</CardContent></Card>
            ) : filtered.accepted.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No accepted connections yet.</CardContent></Card>
            ) : (
              filtered.accepted.map((item, idx) => (
                <motion.div key={item.connectionId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.02 }}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11 border">
                          <AvatarImage src={item.person.image ?? undefined} alt={item.person.fullName} />
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(item.person.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{item.person.fullName}</p>
                          <p className="text-xs text-muted-foreground">{item.person.registrationNo}</p>
                          <p className="text-xs text-muted-foreground">{item.person.facultyName ?? "Faculty"} / {item.person.departmentName ?? "Department"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/directory/${item.person.graduateId}`}>View <ArrowUpRight className="ml-1 size-3.5" /></Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/messages?graduateId=${item.person.graduateId}`}>Message</Link>
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === item.connectionId} onClick={() => runAction(item.connectionId, "block")}>
                          <ShieldMinus className="mr-1 size-3.5" />
                          Block
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === item.connectionId} onClick={() => runAction(item.connectionId, "remove")}>
                          <UserRoundX className="mr-1 size-3.5" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          <TabsContent value="incoming" className="space-y-3">
            {isLoading || !filtered ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading requests...</CardContent></Card>
            ) : filtered.incoming.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No incoming requests.</CardContent></Card>
            ) : (
              filtered.incoming.map((item) => (
                <Card key={item.connectionId}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11 border">
                        <AvatarImage src={item.person.image ?? undefined} alt={item.person.fullName} />
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(item.person.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{item.person.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.person.registrationNo}</p>
                        <p className="text-xs text-muted-foreground">{item.person.departmentName ?? "Department"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busyId === item.connectionId} onClick={() => runAction(item.connectionId, "accept")}>
                        <UserCheck className="mr-1 size-3.5" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId === item.connectionId} onClick={() => runAction(item.connectionId, "decline")}>
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3">
            {isLoading || !filtered ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading requests...</CardContent></Card>
            ) : filtered.outgoing.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No outgoing requests.</CardContent></Card>
            ) : (
              filtered.outgoing.map((item) => (
                <Card key={item.connectionId}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11 border">
                        <AvatarImage src={item.person.image ?? undefined} alt={item.person.fullName} />
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(item.person.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{item.person.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.person.registrationNo}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary"><Clock3 className="mr-1 size-3" />Pending</Badge>
                      <Button size="sm" variant="outline" disabled={busyId === item.connectionId} onClick={() => runAction(item.connectionId, "cancel")}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-3">
            {isLoading || !filtered ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading suggestions...</CardContent></Card>
            ) : filtered.suggestions.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No suggestions available right now.</CardContent></Card>
            ) : (
              filtered.suggestions.map((item) => (
                <Card key={item.person.graduateId}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11 border">
                        <AvatarImage src={item.person.image ?? undefined} alt={item.person.fullName} />
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(item.person.fullName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{item.person.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.person.registrationNo}</p>
                        <p className="text-xs text-muted-foreground">{item.person.facultyName ?? "Faculty"} / {item.person.departmentName ?? "Department"}</p>
                        <div className="mt-1 flex gap-1.5">
                          {item.availableForMentorship ? <Badge variant="outline" className="text-[10px]">Mentor</Badge> : null}
                          {item.openToOpportunities ? <Badge variant="secondary" className="text-[10px]">Open to Work</Badge> : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/directory/${item.person.graduateId}`}>View</Link>
                      </Button>
                      <Button size="sm" disabled={busyId === item.person.graduateId} onClick={() => sendRequest(item.person.graduateId)}>
                        <UserPlus className="mr-1 size-3.5" />
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Card className="border-primary/20">
          <CardContent className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
            <Users2 className="size-3.5" />
            Connections are powered by your real relationship graph in the database, not mock data.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
