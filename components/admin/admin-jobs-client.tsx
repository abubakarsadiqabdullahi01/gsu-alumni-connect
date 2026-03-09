"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  Users,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AdminJob = {
  id: string;
  title: string;
  companyName: string;
  industry: string | null;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "REMOTE" | "HYBRID" | "INTERNSHIP";
  locationCity: string | null;
  locationState: string | null;
  country: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  deadline: string | null;
  postedBy: {
    id: string;
    fullName: string;
    registrationNo: string;
    facultyName: string | null;
    departmentName: string | null;
    user: {
      email: string | null;
      phone: string | null;
    };
  };
  applicationsCount: number;
};

type AdminJobsPayload = {
  jobs: AdminJob[];
  stats: {
    totalJobs: number;
    activeJobs: number;
    closedJobs: number;
    verifiedJobs: number;
    totalApplications: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const jobTypeLabel: Record<AdminJob["jobType"], string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  INTERNSHIP: "Internship",
};

export function AdminJobsClient() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [verified, setVerified] = useState("all");
  const [jobType, setJobType] = useState("all");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<AdminJobsPayload | null>(null);
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
      if (status !== "all") params.set("status", status);
      if (verified !== "all") params.set("verified", verified);
      if (jobType !== "all") params.set("jobType", jobType);

      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      const json = (await res.json()) as AdminJobsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load jobs.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, search, status, verified, jobType]);

  useEffect(() => {
    setPage(1);
  }, [search, status, verified, jobType]);

  const runAction = async (
    jobId: string,
    method: "PATCH" | "DELETE",
    action?: "activate" | "deactivate" | "verify" | "unverify"
  ) => {
    setBusy(jobId);
    setError("");
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(method === "PATCH" ? { body: JSON.stringify({ action }) } : {}),
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

  const jobs = payload?.jobs ?? [];
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
      <DashboardHeader title="Admin Jobs" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Job Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Manage all job postings, verify quality, and moderate visibility.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{stats?.totalJobs ?? 0}</p>
              </div>
              <BriefcaseBusiness className="size-5 text-primary" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats?.activeJobs ?? 0}</p>
              </div>
              <CheckCircle2 className="size-5 text-emerald-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold">{stats?.closedJobs ?? 0}</p>
              </div>
              <XCircle className="size-5 text-red-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{stats?.verifiedJobs ?? 0}</p>
              </div>
              <BadgeCheck className="size-5 text-blue-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Applications</p>
                <p className="text-2xl font-bold">{stats?.totalApplications ?? 0}</p>
              </div>
              <Users className="size-5 text-violet-500" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Search and narrow down job postings.</CardDescription>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, company, poster, registration no"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={verified} onValueChange={setVerified}>
                <SelectTrigger><SelectValue placeholder="Verification" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verification</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger><SelectValue placeholder="Job Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                  <SelectItem value="INTERNSHIP">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {loading ? <p className="text-sm text-muted-foreground">Loading jobs...</p> : null}
            {!loading && jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs found for this filter.</p>
            ) : null}

            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold">{job.title}</p>
                        <Badge variant="outline">{jobTypeLabel[job.jobType]}</Badge>
                        <Badge
                          className={job.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}
                        >
                          {job.isActive ? "Active" : "Closed"}
                        </Badge>
                        <Badge
                          className={job.isVerified ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground"}
                        >
                          {job.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" /> {job.companyName}</span>
                        <span>{[job.locationCity, job.locationState, job.country].filter(Boolean).join(", ") || "Location not set"}</span>
                        <span>{job.industry || "Industry not set"}</span>
                        <span>{job.applicationsCount} applications</span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Posted by <span className="font-medium text-foreground">{job.postedBy.fullName}</span> ({job.postedBy.registrationNo})
                        {" "}
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/jobs/${job.id}`}>
                          <Eye className="mr-1.5 size-3.5" />
                          View
                        </Link>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" disabled={busy === job.id}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {job.isActive ? (
                            <DropdownMenuItem onClick={() => runAction(job.id, "PATCH", "deactivate")}>
                              <XCircle className="mr-2 size-4" />
                              Close Job
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => runAction(job.id, "PATCH", "activate")}>
                              <CheckCircle2 className="mr-2 size-4" />
                              Reopen Job
                            </DropdownMenuItem>
                          )}

                          {job.isVerified ? (
                            <DropdownMenuItem onClick={() => runAction(job.id, "PATCH", "unverify")}>
                              <ShieldX className="mr-2 size-4" />
                              Remove Verification
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => runAction(job.id, "PATCH", "verify")}>
                              <ShieldCheck className="mr-2 size-4" />
                              Verify Job
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => runAction(job.id, "DELETE")}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete Job
                          </DropdownMenuItem>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1 || loading}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
