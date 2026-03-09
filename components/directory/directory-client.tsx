"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Briefcase,
  Filter,
  GraduationCap,
  Handshake,
  LayoutGrid,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DirectoryItem = {
  id: string;
  fullName: string;
  registrationNo: string;
  departmentName: string | null;
  facultyName: string | null;
  graduationYear: string | null;
  degreeClass: string | null;
  stateOfOrigin: string | null;
  bio: string | null;
  openToOpportunities: boolean;
  availableForMentorship: boolean;
  connectionStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED" | null;
  user: { image: string | null };
};

type DirectoryClientProps = {
  departments: string[];
  years: string[];
  initialItems: DirectoryItem[];
  initialPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const degreeLabels: Record<string, string> = {
  FIRST_CLASS: "1st Class",
  SECOND_CLASS_UPPER: "2nd Upper",
  SECOND_CLASS_LOWER: "2nd Lower",
  THIRD_CLASS: "3rd Class",
  PASS: "Pass",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function DirectoryClient({
  departments,
  years,
  initialItems,
  initialPagination,
}: DirectoryClientProps) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [year, setYear] = useState("all");
  const [directoryTab, setDirectoryTab] = useState<"all" | "connected" | "openToWork" | "mentors">("all");
  const [page, setPage] = useState(initialPagination.page);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(initialPagination.pageSize));
    if (query.trim()) params.set("q", query.trim());
    if (department !== "all") params.set("department", department);
    if (year !== "all") params.set("year", year);
    return `/api/directory?${params.toString()}`;
  }, [query, department, year, page, initialPagination.pageSize]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(requestUrl);
        const data = (await res.json()) as {
          error?: string;
          items?: DirectoryItem[];
          pagination?: DirectoryClientProps["initialPagination"];
        };
        if (!res.ok || !data.items || !data.pagination) {
          if (!cancelled) setError(data.error ?? "Failed to load directory.");
          return;
        }
        if (!cancelled) {
          setItems(data.items);
          setPagination(data.pagination);
        }
      } catch {
        if (!cancelled) setError("Unable to load directory.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [requestUrl]);

  useEffect(() => {
    setPage(1);
  }, [query, department, year]);

  const sendConnection = async (graduateId: string) => {
    setError("");
    setConnectingId(graduateId);
    try {
      const res = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverGraduateId: graduateId }),
      });
      const data = (await res.json()) as { error?: string; status?: DirectoryItem["connectionStatus"] };
      if (!res.ok || !data.status) {
        setError(data.error ?? "Failed to send connection request.");
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === graduateId ? { ...item, connectionStatus: data.status ?? "PENDING" } : item))
      );
    } catch {
      setError("Unable to send connection request.");
    } finally {
      setConnectingId(null);
    }
  };

  const connectLabel = (status: DirectoryItem["connectionStatus"]) => {
    if (status === "ACCEPTED") return "Connected";
    if (status === "PENDING") return "Pending";
    if (status === "BLOCKED") return "Blocked";
    return "Connect";
  };

  const scopedItems = useMemo(() => {
    if (directoryTab === "connected") {
      return items.filter((item) => item.connectionStatus === "ACCEPTED");
    }
    if (directoryTab === "openToWork") {
      return items.filter((item) => item.openToOpportunities);
    }
    if (directoryTab === "mentors") {
      return items.filter((item) => item.availableForMentorship);
    }
    return items;
  }, [items, directoryTab]);

  return (
    <>
      <DashboardHeader title="Alumni Directory" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Alumni Directory</CardTitle>
            <CardDescription className="text-sm">
              Explore verified alumni profiles with professional filters by department and graduation year.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, department, faculty, or registration no"
                  className="pl-9"
                />
              </div>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dep) => (
                    <SelectItem key={dep} value={dep}>
                      {dep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Graduation Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((yr) => (
                    <SelectItem key={yr} value={yr}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-center rounded-md border px-3 text-xs text-muted-foreground">
                <Filter className="mr-2 size-3.5" />
                {pagination.total} results
              </div>
            </div>
            <Tabs
              value={directoryTab}
              onValueChange={(v) => setDirectoryTab(v as "all" | "connected" | "openToWork" | "mentors")}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1 md:grid-cols-4">
                <TabsTrigger
                  value="all"
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
                >
                  <LayoutGrid className="size-3.5" />
                  <span>All</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {items.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="connected"
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
                >
                  <Handshake className="size-3.5" />
                  <span>Connected</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {items.filter((item) => item.connectionStatus === "ACCEPTED").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="openToWork"
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
                >
                  <Briefcase className="size-3.5" />
                  <span>Open to Work</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {items.filter((item) => item.openToOpportunities).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="mentors"
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs data-[state=active]:bg-background"
                >
                  <Sparkles className="size-3.5" />
                  <span>Mentors</span>
                  <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                    {items.filter((item) => item.availableForMentorship).length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {scopedItems.map((grad, idx) => (
            <motion.div
              key={grad.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
            >
              <Card className="h-full border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-12 shrink-0 border">
                      <AvatarImage src={grad.user.image ?? undefined} alt={grad.fullName} />
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {initials(grad.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold">{grad.fullName}</h3>
                      <p className="truncate pt-0.5 text-[11px] text-muted-foreground">{grad.registrationNo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {grad.facultyName ?? "Faculty not set"} / {grad.departmentName ?? "Department not set"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {grad.bio ?? "No bio added yet."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {grad.graduationYear ? (
                      <Badge variant="secondary" className="text-[10px]">
                        <GraduationCap className="mr-1 size-2.5" />
                        {grad.graduationYear}
                      </Badge>
                    ) : null}
                    {grad.degreeClass ? (
                      <Badge variant="outline" className="text-[10px]">
                        {degreeLabels[grad.degreeClass] ?? grad.degreeClass}
                      </Badge>
                    ) : null}
                    {grad.stateOfOrigin ? (
                      <Badge variant="outline" className="text-[10px]">
                        <MapPin className="mr-1 size-2.5" />
                        {grad.stateOfOrigin}
                      </Badge>
                    ) : null}
                    {grad.openToOpportunities ? (
                      <Badge className="text-[10px]">Open to Work</Badge>
                    ) : null}
                    {grad.availableForMentorship ? (
                      <Badge variant="outline" className="text-[10px]">
                        <Sparkles className="mr-1 size-2.5" />
                        Mentor
                      </Badge>
                    ) : null}
                  </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => sendConnection(grad.id)}
                        disabled={connectingId === grad.id || grad.connectionStatus === "ACCEPTED" || grad.connectionStatus === "BLOCKED"}
                      >
                        <Handshake className="mr-1.5 size-3" />
                        {connectingId === grad.id ? "Sending..." : connectLabel(grad.connectionStatus)}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" asChild>
                        <Link href={`/directory/${grad.id}`}>
                          View Details
                          <ArrowUpRight className="ml-1.5 size-3.5" />
                        </Link>
                      </Button>
                    </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {scopedItems.length === 0 && !loading ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No alumni found for the selected view.
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading || pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
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
