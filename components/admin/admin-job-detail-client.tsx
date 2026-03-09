"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ApplicationStatus = "APPLIED" | "REVIEWED" | "SHORTLISTED" | "REJECTED";

type JobDetailPayload = {
  job: {
    id: string;
    title: string;
    companyName: string;
    description: string | null;
    requirements: string | null;
    industry: string | null;
    jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "REMOTE" | "HYBRID" | "INTERNSHIP";
    locationCity: string | null;
    locationState: string | null;
    country: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryVisible: boolean;
    currencyCode: string;
    applicationUrl: string | null;
    applicationEmail: string | null;
    deadline: string | null;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
    applicationsCount: number;
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
    applications: Array<{
      id: string;
      status: ApplicationStatus;
      coverNote: string | null;
      cvUrl: string | null;
      appliedAt: string;
      applicant: {
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
    }>;
  };
};

const jobTypeLabel: Record<JobDetailPayload["job"]["jobType"], string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  INTERNSHIP: "Internship",
};

const applicationStatuses: ApplicationStatus[] = ["APPLIED", "REVIEWED", "SHORTLISTED", "REJECTED"];

function formatMoney(value: number | null, currencyCode: string) {
  if (value == null) return "Not disclosed";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode || "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminJobDetailClient({ jobId }: { jobId: string }) {
  const [payload, setPayload] = useState<JobDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ApplicationStatus>>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`);
      const json = (await res.json()) as JobDetailPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load job.");
        return;
      }
      setPayload(json);
      setStatusDrafts(
        Object.fromEntries(json.job.applications.map((app) => [app.id, app.status])) as Record<string, ApplicationStatus>
      );
    } catch {
      setError("Failed to load job.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [jobId]);

  const runJobAction = async (action: "activate" | "deactivate" | "verify" | "unverify" | "delete") => {
    setBusy(true);
    setError("");
    try {
      const method = action === "delete" ? "DELETE" : "PATCH";
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(method === "PATCH" ? { body: JSON.stringify({ action }) } : {}),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to update job.");
        return;
      }
      if (action === "delete") {
        window.location.href = "/admin/jobs";
        return;
      }
      await load();
    } catch {
      setError("Failed to update job.");
    } finally {
      setBusy(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string) => {
    const status = statusDrafts[applicationId];
    if (!status) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to update application status.");
        return;
      }
      await load();
    } catch {
      setError("Failed to update application status.");
    } finally {
      setBusy(false);
    }
  };

  const shortlistedCount = useMemo(() => {
    if (!payload) return 0;
    return payload.job.applications.filter((a) => a.status === "SHORTLISTED").length;
  }, [payload]);

  return (
    <>
      <DashboardHeader title="Admin Job Detail" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/jobs">
              <ArrowLeft className="mr-1.5 size-4" />
              Back to Jobs
            </Link>
          </Button>

          {payload ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={busy}>
                  <MoreHorizontal className="mr-1.5 size-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {payload.job.isActive ? (
                  <DropdownMenuItem onClick={() => runJobAction("deactivate")}>
                    <XCircle className="mr-2 size-4" />
                    Close Job
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => runJobAction("activate")}>
                    <CheckCircle2 className="mr-2 size-4" />
                    Reopen Job
                  </DropdownMenuItem>
                )}

                {payload.job.isVerified ? (
                  <DropdownMenuItem onClick={() => runJobAction("unverify")}>
                    <ShieldX className="mr-2 size-4" />
                    Remove Verification
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => runJobAction("verify")}>
                    <ShieldCheck className="mr-2 size-4" />
                    Verify Job
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => runJobAction("delete")}>
                  <Trash2 className="mr-2 size-4" />
                  Delete Job
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading job details...</p> : null}

        {!loading && payload ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{payload.job.title}</CardTitle>
                  <Badge variant="outline">{jobTypeLabel[payload.job.jobType]}</Badge>
                  <Badge className={payload.job.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
                    {payload.job.isActive ? "Active" : "Closed"}
                  </Badge>
                  <Badge className={payload.job.isVerified ? "bg-blue-50 text-blue-700" : "bg-muted text-muted-foreground"}>
                    {payload.job.isVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <CardDescription>
                  {payload.job.companyName} • Posted {formatDistanceToNow(new Date(payload.job.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <p className="inline-flex items-center gap-2 text-muted-foreground"><Building2 className="size-4" /> {payload.job.industry || "Industry not set"}</p>
                  <p className="inline-flex items-center gap-2 text-muted-foreground"><MapPin className="size-4" /> {[payload.job.locationCity, payload.job.locationState, payload.job.country].filter(Boolean).join(", ") || "Location not set"}</p>
                  <p className="inline-flex items-center gap-2 text-muted-foreground"><CalendarClock className="size-4" /> Deadline: {payload.job.deadline ? new Date(payload.job.deadline).toLocaleDateString() : "Not set"}</p>
                  <p className="inline-flex items-center gap-2 text-muted-foreground"><Users className="size-4" /> {payload.job.applicationsCount} applications ({shortlistedCount} shortlisted)</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Salary</p>
                  <p className="font-medium">
                    {payload.job.salaryVisible
                      ? `${formatMoney(payload.job.salaryMin, payload.job.currencyCode)} - ${formatMoney(payload.job.salaryMax, payload.job.currencyCode)}`
                      : "Hidden from public"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap">{payload.job.description || "No description provided."}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Requirements</p>
                  <p className="whitespace-pre-wrap">{payload.job.requirements || "No requirements provided."}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Posted By</p>
                  <p className="font-medium">{payload.job.postedBy.fullName} ({payload.job.postedBy.registrationNo})</p>
                  <p className="text-xs text-muted-foreground">{payload.job.postedBy.facultyName || "-"} • {payload.job.postedBy.departmentName || "-"}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {payload.job.postedBy.user.email || "No email"}</span>
                    <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {payload.job.postedBy.user.phone || "No phone"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Applicants</CardTitle>
                <CardDescription>Review and update application status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {payload.job.applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No applications yet.</p>
                ) : (
                  payload.job.applications.map((app) => (
                    <div key={app.id} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{app.applicant.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {app.applicant.registrationNo} • {app.applicant.facultyName || "-"} • {app.applicant.departmentName || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {app.applicant.user.email || "No email"}</span>
                            <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {app.applicant.user.phone || "No phone"}</span>
                          </div>
                          {app.coverNote ? (
                            <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs whitespace-pre-wrap">{app.coverNote}</p>
                          ) : null}
                          {app.cvUrl ? (
                            <a href={app.cvUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                              View CV Link
                            </a>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={statusDrafts[app.id] ?? app.status}
                            onValueChange={(value) =>
                              setStatusDrafts((prev) => ({ ...prev, [app.id]: value as ApplicationStatus }))
                            }
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {applicationStatuses.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            size="sm"
                            onClick={() => updateApplicationStatus(app.id)}
                            disabled={busy || (statusDrafts[app.id] ?? app.status) === app.status}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </>
  );
}
