"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  Send,
  UserCheck2,
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

type Job = {
  id: string;
  title: string;
  companyName: string;
  description: string | null;
  requirements: string | null;
  industry: string | null;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "REMOTE" | "HYBRID" | "INTERNSHIP";
  locationCity: string | null;
  locationState: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryVisible: boolean;
  currencyCode: string;
  applicationUrl: string | null;
  applicationEmail: string | null;
  deadline: string | null;
  createdAt: string;
  isVerified: boolean;
  postedBy: {
    fullName: string;
    departmentName: string | null;
    user: { image: string | null };
  };
  applicationsCount: number;
  hasApplied: boolean;
  isMine: boolean;
};

type MyPost = {
  id: string;
  title: string;
  companyName: string;
  locationCity: string | null;
  locationState: string | null;
  jobType: string;
  isActive: boolean;
  createdAt: string;
  deadline: string | null;
  applicationsCount: number;
  applications: Array<{
    id: string;
    status: string;
    appliedAt: string;
    coverNote: string | null;
    cvUrl: string | null;
    applicant: {
      fullName: string;
      registrationNo: string;
      departmentName: string | null;
      facultyName: string | null;
      user: { email: string | null; phone: string | null };
    };
  }>;
};

type MyApplication = {
  id: string;
  status: string;
  appliedAt: string;
  job: {
    id: string;
    title: string;
    companyName: string;
    jobType: string;
    locationCity: string | null;
    locationState: string | null;
    isActive: boolean;
    deadline: string | null;
    postedBy: { fullName: string };
  };
};

type JobsPayload = {
  jobs: Job[];
  myPosts: MyPost[];
  myApplications: MyApplication[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const jobTypeLabel: Record<Job["jobType"], string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  INTERNSHIP: "Internship",
};

function money(n: number | null, code: string) {
  if (n == null) return "Not disclosed";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: code || "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

export function JobsClient() {
  const [tab, setTab] = useState<"browse" | "my-posts" | "applied">("browse");
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<JobsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [openPostDialog, setOpenPostDialog] = useState(false);
  const [myPostPage, setMyPostPage] = useState(1);
  const [myAppPage, setMyAppPage] = useState(1);

  const [form, setForm] = useState({
    title: "",
    companyName: "",
    description: "",
    requirements: "",
    industry: "",
    jobType: "FULL_TIME",
    locationCity: "",
    locationState: "",
    salaryMin: "",
    salaryMax: "",
    applicationUrl: "",
    applicationEmail: "",
    deadline: "",
  });

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "10");
      if (search.trim()) params.set("q", search.trim());
      if (jobType !== "all") params.set("jobType", jobType);
      if (stateFilter !== "all") params.set("state", stateFilter);
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const json = (await res.json()) as JobsPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load jobs.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Unable to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [page, search, jobType, stateFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, jobType, stateFilter]);

  const applyJob = async (jobId: string, externalUrl?: string | null) => {
    setBusyId(jobId);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to apply.");
        return;
      }
      if (externalUrl) {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
      }
      await load();
      setTab("applied");
    } catch {
      setError("Failed to apply.");
    } finally {
      setBusyId(null);
    }
  };

  const submitJob = async () => {
    setError("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          companyName: form.companyName,
          description: form.description || undefined,
          requirements: form.requirements || undefined,
          industry: form.industry || undefined,
          jobType: form.jobType,
          locationCity: form.locationCity || undefined,
          locationState: form.locationState || undefined,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
          applicationUrl: form.applicationUrl || undefined,
          applicationEmail: form.applicationEmail || undefined,
          deadline: form.deadline || undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to post job.");
        return;
      }
      setForm({
        title: "",
        companyName: "",
        description: "",
        requirements: "",
        industry: "",
        jobType: "FULL_TIME",
        locationCity: "",
        locationState: "",
        salaryMin: "",
        salaryMax: "",
        applicationUrl: "",
        applicationEmail: "",
        deadline: "",
      });
      setOpenPostDialog(false);
      await load();
      setTab("my-posts");
    } catch {
      setError("Failed to post job.");
    }
  };

  const myPosts = payload?.myPosts ?? [];
  const myApplications = payload?.myApplications ?? [];
  const perTabPageSize = 6;
  const myPostsTotalPages = Math.max(1, Math.ceil(myPosts.length / perTabPageSize));
  const myAppsTotalPages = Math.max(1, Math.ceil(myApplications.length / perTabPageSize));
  const visibleMyPosts = useMemo(
    () => myPosts.slice((myPostPage - 1) * perTabPageSize, myPostPage * perTabPageSize),
    [myPosts, myPostPage]
  );
  const visibleMyApps = useMemo(
    () => myApplications.slice((myAppPage - 1) * perTabPageSize, myAppPage * perTabPageSize),
    [myApplications, myAppPage]
  );

  return (
    <>
      <DashboardHeader title="Jobs" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="overflow-hidden border-primary/20">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-extrabold tracking-tight">Job Board</CardTitle>
              <CardDescription>Browse real openings, publish opportunities, and track applications.</CardDescription>
            </div>
            <Dialog open={openPostDialog} onOpenChange={setOpenPostDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 size-4" />
                  Post Job
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Job Posting</DialogTitle>
                  <DialogDescription>Share an opportunity with the alumni network.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Job Title</Label>
                    <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Job Type</Label>
                    <Select value={form.jobType} onValueChange={(v) => setForm((f) => ({ ...f, jobType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="CONTRACT">Contract</SelectItem>
                        <SelectItem value="REMOTE">Remote</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                        <SelectItem value="INTERNSHIP">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Deadline</Label>
                    <Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Location City</Label>
                    <Input value={form.locationCity} onChange={(e) => setForm((f) => ({ ...f, locationCity: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Location State</Label>
                    <Input value={form.locationState} onChange={(e) => setForm((f) => ({ ...f, locationState: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Salary Min</Label>
                    <Input type="number" value={form.salaryMin} onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Salary Max</Label>
                    <Input type="number" value={form.salaryMax} onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Requirements</Label>
                    <Textarea value={form.requirements} onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Application URL</Label>
                    <Input value={form.applicationUrl} onChange={(e) => setForm((f) => ({ ...f, applicationUrl: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Application Email</Label>
                    <Input value={form.applicationEmail} onChange={(e) => setForm((f) => ({ ...f, applicationEmail: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenPostDialog(false)}>Cancel</Button>
                  <Button onClick={submitJob} disabled={!form.title.trim() || !form.companyName.trim()}>
                    <Send className="mr-1.5 size-4" />
                    Publish Job
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={tab} onValueChange={(v) => setTab(v as "browse" | "my-posts" | "applied")} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="browse" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              Browse ({payload?.pagination.total ?? 0})
            </TabsTrigger>
            <TabsTrigger value="my-posts" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              My Postings ({myPosts.length})
            </TabsTrigger>
            <TabsTrigger value="applied" className="rounded-lg py-2 text-xs data-[state=active]:bg-background">
              Applied ({myApplications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search title, company, industry, location" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
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
              <Input placeholder="State (e.g. Lagos)" value={stateFilter === "all" ? "" : stateFilter} onChange={(e) => setStateFilter(e.target.value || "all")} />
            </div>

            {loading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading jobs...</CardContent></Card>
            ) : !payload || payload.jobs.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No jobs found for this filter.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {payload.jobs.map((job) => (
                  <Card key={job.id} className="border-border/70 transition-all hover:shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-primary/10 p-2">
                              <BriefcaseBusiness className="size-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold">{job.title}</p>
                              <p className="text-xs text-muted-foreground">{job.companyName}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <Badge variant="secondary">{jobTypeLabel[job.jobType]}</Badge>
                            {job.isVerified ? <Badge variant="outline">Verified</Badge> : null}
                            <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{job.locationCity ?? "Unknown"}, {job.locationState ?? "Unknown"}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{job.applicationsCount} applicants</span>
                          </div>
                          {job.description ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{job.description}</p> : null}
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Posted by <span className="font-medium text-foreground">{job.postedBy.fullName}</span> - {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                            {job.deadline ? ` - Deadline ${new Date(job.deadline).toLocaleDateString()}` : ""}
                          </p>
                          {job.salaryVisible ? (
                            <p className="mt-1 text-xs font-medium text-foreground">{money(job.salaryMin, job.currencyCode)} - {money(job.salaryMax, job.currencyCode)}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {job.hasApplied && job.applicationUrl ? (
                            <Button size="sm" variant="outline" asChild>
                              <a href={job.applicationUrl} target="_blank" rel="noreferrer">Open Link <ExternalLink className="ml-1 size-3.5" /></a>
                            </Button>
                          ) : null}
                          <Button size="sm" disabled={job.hasApplied || job.isMine || busyId === job.id} onClick={() => void applyJob(job.id, job.applicationUrl)}>
                            {job.isMine ? "My Job" : job.hasApplied ? "Applied" : busyId === job.id ? "Applying..." : job.applicationUrl ? "Apply & Track" : "Apply"}
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
                <p className="text-xs text-muted-foreground">Page {payload?.pagination.page ?? 1} of {payload?.pagination.totalPages ?? 1}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={(payload?.pagination.page ?? 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={(payload?.pagination.page ?? 1) >= (payload?.pagination.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-posts" className="space-y-3">
            {visibleMyPosts.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No job postings yet.</CardContent></Card>
            ) : (
              visibleMyPosts.map((job) => (
                <Card key={job.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.companyName} - {job.locationCity ?? "Unknown"}, {job.locationState ?? "Unknown"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{job.applicationsCount}</p>
                        <p className="text-xs text-muted-foreground">applications</p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <ClipboardCheck className="mr-1.5 size-3.5" />
                            View Applicants
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Applicants - {job.title}</DialogTitle>
                            <DialogDescription>{job.applicationsCount} total application{job.applicationsCount === 1 ? "" : "s"}.</DialogDescription>
                          </DialogHeader>
                          <div className="max-h-[420px] space-y-2 overflow-y-auto">
                            {job.applications.length === 0 ? (
                              <Card><CardContent className="p-4 text-sm text-muted-foreground">No applications yet.</CardContent></Card>
                            ) : (
                              job.applications.map((app) => (
                                <Card key={app.id}>
                                  <CardContent className="space-y-1.5 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold">{app.applicant.fullName}</p>
                                      <Badge variant="secondary">{app.status}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{app.applicant.registrationNo} - {app.applicant.facultyName ?? "Faculty"} / {app.applicant.departmentName ?? "Department"}</p>
                                    <p className="text-xs text-muted-foreground">Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}</p>
                                    {app.applicant.user.email ? <p className="text-xs text-muted-foreground">Email: {app.applicant.user.email}</p> : null}
                                    {app.applicant.user.phone ? <p className="text-xs text-muted-foreground">Phone: {app.applicant.user.phone}</p> : null}
                                    {app.coverNote ? <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">{app.coverNote}</p> : null}
                                    {app.cvUrl ? (
                                      <a className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" href={app.cvUrl} target="_blank" rel="noreferrer">
                                        Open CV
                                        <ExternalLink className="size-3.5" />
                                      </a>
                                    ) : null}
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-xs text-muted-foreground">Page {myPostPage} of {myPostsTotalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={myPostPage <= 1} onClick={() => setMyPostPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={myPostPage >= myPostsTotalPages} onClick={() => setMyPostPage((p) => Math.min(myPostsTotalPages, p + 1))}>Next</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applied" className="space-y-3">
            {visibleMyApps.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">No applications yet.</CardContent></Card>
            ) : (
              visibleMyApps.map((app) => (
                <Card key={app.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold">{app.job.title}</p>
                      <p className="text-xs text-muted-foreground">{app.job.companyName} - by {app.job.postedBy.fullName}</p>
                      <p className="text-xs text-muted-foreground">Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}</p>
                    </div>
                    <Badge variant={app.status === "APPLIED" ? "secondary" : "outline"}>
                      <UserCheck2 className="mr-1 size-3" />
                      {app.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-xs text-muted-foreground">Page {myAppPage} of {myAppsTotalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={myAppPage <= 1} onClick={() => setMyAppPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={myAppPage >= myAppsTotalPages} onClick={() => setMyAppPage((p) => Math.min(myAppsTotalPages, p + 1))}>Next</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-primary/20">
          <CardContent className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
            <Building2 className="size-3.5" />
            Jobs are powered by real database records with tracked applications and applicant visibility for job owners.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
