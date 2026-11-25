"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Flag } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Report = {
  id: string;
  targetType: "POST" | "COMMENT" | "MESSAGE" | "PROFILE";
  targetId: string;
  reason: string;
  details: string | null;
  status: "OPEN" | "ACTIONED" | "DISMISSED";
  resolution: string | null;
  createdAt: string;
  reporter: { fullName: string; registrationNo: string };
  subject: { id: string; fullName: string; registrationNo: string; accountStatus: string; totalReports: number } | null;
  preview: { text: string; removed: boolean } | null;
};

const REMOVE_LABEL: Record<Report["targetType"], string> = {
  POST: "Remove post",
  COMMENT: "Remove comment",
  MESSAGE: "Remove message",
  PROFILE: "Hide profile",
};

export default function AdminReportsPage() {
  const [status, setStatus] = useState("OPEN");
  const [items, setItems] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/reports?status=${status}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setError("Could not load reports.");
          return;
        }
        const body = (await response.json()) as { items: Report[] };
        if (!cancelled) {
          setError(null);
          setItems(body.items);
        }
      })
      .catch(() => !cancelled && setError("Could not load reports."));
    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);

  async function decide(report: Report, action: "dismiss" | "remove" | "suspend") {
    if (action === "suspend" && !window.confirm(`Suspend ${report.subject?.fullName ?? "this member"}? They will be signed out and unable to sign in.`)) return;
    setBusy(report.id);
    const response = await fetch(`/api/admin/reports/${report.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!response.ok) setError("That action failed. Please try again.");
    setReloadKey((key) => key + 1);
  }

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader title="Reports" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="size-4 text-primary" />
              Reported content and members
            </CardTitle>
            <CardDescription>
              Members report posts, messages and profiles from the app. Both app stores expect a report to be
              reviewed within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={status} onValueChange={setStatus}>
              <TabsList>
                <TabsTrigger value="OPEN">Open</TabsTrigger>
                <TabsTrigger value="ACTIONED">Actioned</TabsTrigger>
                <TabsTrigger value="DISMISSED">Dismissed</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {items === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          <div className="space-y-4">
            {items.map((report) => (
              <Card key={report.id}>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{report.targetType.toLowerCase()}</Badge>
                    <Badge variant="destructive">{report.reason.toLowerCase()}</Badge>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })} by {report.reporter.fullName} (
                      {report.reporter.registrationNo})
                    </span>
                  </div>

                  {report.preview && (
                    <blockquote className="rounded-md border-l-4 border-destructive/40 bg-muted/40 p-3 whitespace-pre-wrap">
                      {report.preview.removed ? <em>Removed: </em> : null}
                      {report.preview.text}
                    </blockquote>
                  )}
                  {report.details && <p><strong>Reporter&rsquo;s note:</strong> {report.details}</p>}

                  <p>
                    <strong>Member responsible:</strong>{" "}
                    {report.subject ? (
                      <>
                        {report.subject.fullName} ({report.subject.registrationNo}) · {report.subject.accountStatus.toLowerCase()} ·{" "}
                        {report.subject.totalReports} report{report.subject.totalReports === 1 ? "" : "s"} in total
                      </>
                    ) : (
                      "account deleted"
                    )}
                  </p>

                  {report.status === "OPEN" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={busy === report.id} onClick={() => decide(report, "dismiss")}>
                        Dismiss
                      </Button>
                      <Button size="sm" variant="secondary" disabled={busy === report.id} onClick={() => decide(report, "remove")}>
                        {REMOVE_LABEL[report.targetType]}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === report.id || !report.subject || report.subject.accountStatus === "SUSPENDED"}
                        onClick={() => decide(report, "suspend")}
                      >
                        Remove and suspend member
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{report.resolution}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
