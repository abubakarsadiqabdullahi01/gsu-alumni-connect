"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  UserCheck2,
  UserX2,
  XCircle,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MentorshipStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED";

type DetailPayload = {
  mentorship: {
    id: string;
    subject: string | null;
    message: string | null;
    notes: string | null;
    status: MentorshipStatus;
    createdAt: string;
    acceptedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
    mentor: {
      id: string;
      fullName: string;
      registrationNo: string;
      facultyName: string | null;
      departmentName: string | null;
      user: { email: string | null; phone: string | null };
    };
    mentee: {
      id: string;
      fullName: string;
      registrationNo: string;
      facultyName: string | null;
      departmentName: string | null;
      user: { email: string | null; phone: string | null };
    };
  };
  timeline: Array<{
    key: string;
    label: string;
    at: string;
  }>;
};

const statusClass: Record<MentorshipStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-red-50 text-red-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-slate-100 text-slate-700",
};

export function AdminMentorshipDetailClient({ mentorshipId }: { mentorshipId: string }) {
  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/mentorship/${mentorshipId}`);
      const json = (await res.json()) as DetailPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to load mentorship detail.");
        return;
      }
      setPayload(json);
    } catch {
      setError("Failed to load mentorship detail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [mentorshipId]);

  const runAction = async (action: "accept" | "decline" | "cancel" | "complete") => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/mentorship/${mentorshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
      setBusy(false);
    }
  };

  const mentorship = payload?.mentorship;

  return (
    <>
      <DashboardHeader title="Admin Mentorship Detail" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/mentorship">
            <ArrowLeft className="mr-1.5 size-4" />
            Back to Mentorship
          </Link>
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">Loading mentorship detail...</p> : null}

        {!loading && mentorship ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{mentorship.subject || "Mentorship Session"}</CardTitle>
                  <Badge className={statusClass[mentorship.status]}>{mentorship.status}</Badge>
                </div>
                <CardDescription>
                  Created {formatDistanceToNow(new Date(mentorship.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {mentorship.message ? <p>{mentorship.message}</p> : <p className="text-muted-foreground">No request message.</p>}
                {mentorship.notes ? (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Completion Notes</p>
                    <p>{mentorship.notes}</p>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Mentor</p>
                    <p className="font-medium">{mentorship.mentor.fullName} ({mentorship.mentor.registrationNo})</p>
                    <p className="text-xs text-muted-foreground">{mentorship.mentor.facultyName || "-"} • {mentorship.mentor.departmentName || "-"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {mentorship.mentor.user.email || "No email"}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {mentorship.mentor.user.phone || "No phone"}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">Mentee</p>
                    <p className="font-medium">{mentorship.mentee.fullName} ({mentorship.mentee.registrationNo})</p>
                    <p className="text-xs text-muted-foreground">{mentorship.mentee.facultyName || "-"} • {mentorship.mentee.departmentName || "-"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {mentorship.mentee.user.email || "No email"}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {mentorship.mentee.user.phone || "No phone"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {mentorship.status === "PENDING" ? (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => runAction("accept")}>
                        <CheckCircle2 className="mr-1.5 size-4" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction("decline")}>
                        <UserX2 className="mr-1.5 size-4" />
                        Decline
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction("cancel")}>
                        <XCircle className="mr-1.5 size-4" />
                        Cancel
                      </Button>
                    </>
                  ) : null}

                  {mentorship.status === "ACCEPTED" ? (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => runAction("complete")}>
                        <UserCheck2 className="mr-1.5 size-4" />
                        Mark Completed
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => runAction("cancel")}>
                        <XCircle className="mr-1.5 size-4" />
                        Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timeline</CardTitle>
                <CardDescription>Status progression of this mentorship.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payload.timeline.map((event) => (
                    <div key={event.key} className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-primary/15 p-1.5 text-primary">
                        <Clock3 className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.at).toLocaleString()} ({formatDistanceToNow(new Date(event.at), { addSuffix: true })})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </>
  );
}
