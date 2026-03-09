import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Info,
  Upload,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { UploadClient } from "@/components/upload/upload-client";
import { prisma } from "@/lib/db";
import Link from "next/link";

// ── Upload-log helpers ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  COMPLETED: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  FAILED: {
    icon: AlertCircle,
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800/30 dark:bg-red-950/40 dark:text-red-400",
  },
  PROCESSING: {
    icon: Clock,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/40 dark:text-amber-400",
  },
} as const;

export default async function AdminUploadsPage() {
  // ── Real data from DB ────────────────────────────────────────────────────────
  let uploadLogs: any[] = [];
  let dbError: string | null = null;

  try {
    uploadLogs = await prisma.uploadAuditLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    });
  } catch (error) {
    dbError =
      error instanceof Error
        ? error.message
        : "Failed to load upload logs from database";
    console.error("[AdminUploads] DB Error:", error);
    uploadLogs = [];
  }

  const totalImported = uploadLogs
    .filter((l) => l.status === "COMPLETED")
    .reduce((s, l) => s + l.created, 0);
  const totalUpdated = uploadLogs
    .filter((l) => l.status === "COMPLETED")
    .reduce((s, l) => s + l.updated, 0);
  const totalFailed = uploadLogs.reduce((s, l) => s + l.failed, 0);
  return (
    <>
      <DashboardHeader title="Upload Management" />
      <div className="flex-1 space-y-8 p-4 md:p-6">
        {/* DB Error Alert */}
        {dbError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800/30 dark:bg-red-950/40 dark:text-red-400">
            <p className="font-semibold">Database Connection Error</p>
            <p className="mt-1 text-sm">{dbError}</p>
            <p className="mt-2 text-xs opacity-75">
              Confirm your `DATABASE_URL` is correct, ensure PostgreSQL is
              running, and retry the upload.
            </p>
          </div>
        )}

        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Upload Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Import graduate records from Excel graduation lists (2009–2024)
            </p>
          </div>
          {/* Template download hint */}
          <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
            <a href="/api/admin/uploads/template">
              <Download className="size-3.5" />
              Download Template
            </a>
          </Button>
        </div>

        {/* Overview stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Uploads"
            value={uploadLogs.length}
            icon={Upload}
            description="All-time import sessions"
          />
          <StatCard
            title="Records Created"
            value={totalImported.toLocaleString()}
            icon={CheckCircle2}
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Records Updated"
            value={totalUpdated.toLocaleString()}
            icon={BarChart3}
            description="Upserted on re-upload"
          />
          <StatCard
            title="Failed Rows"
            value={totalFailed}
            icon={AlertTriangle}
            description="Across all sessions"
          />
        </div>

        {/* Main two-column grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left — Upload wizard */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <FileSpreadsheet className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-[15px] font-bold">
                    Import Graduate Data
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Upload an Excel file — all 3 structural eras auto-detected
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UploadClient />
            </CardContent>
          </Card>

          {/* Right — Guidelines + info */}
          <div className="space-y-4">
            {/* Supported formats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <Info className="size-4 text-primary" />
                  Supported Formats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {[
                  {
                    era: "Legacy",
                    years: "2009–2012",
                    notes: "Embedded title rows. Data starts at row 4. Columns remapped automatically.",
                    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30",
                  },
                  {
                    era: "Mid-Era",
                    years: "2013–2019",
                    notes: "Name split into SURNAME + other_names. JAMB number present. CGPA not available.",
                    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30",
                  },
                  {
                    era: "Modern",
                    years: "2021–2024",
                    notes: "Full columns: CGPA, degree class, faculty, LGA, state. Standard header row.",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30",
                  },
                ].map((f) => (
                  <div key={f.era} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{f.era} Era</span>
                      <Badge className={`border text-[10px] ${f.color}`}>{f.years}</Badge>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">{f.notes}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Duplicate protection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Duplicate Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                {[
                  {
                    layer: "Layer 1",
                    desc: "Client-side Set deduplication before API call",
                  },
                  {
                    layer: "Layer 2",
                    desc: "API pre-insert lookup by registration number",
                  },
                  {
                    layer: "Layer 3",
                    desc: "DB UNIQUE constraint on registration_no column",
                  },
                ].map((l) => (
                  <div key={l.layer} className="flex gap-2">
                    <span className="shrink-0 font-bold text-foreground">{l.layer}:</span>
                    <span>{l.desc}</span>
                  </div>
                ))}
                <Separator className="my-1" />
                <p className="text-amber-600 dark:text-amber-400">
                  Cross-sheet duplicates are queued for admin review rather than
                  auto-resolved. You will be notified after import.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upload history */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] font-bold">
                  Upload History
                </CardTitle>
                <CardDescription className="text-xs">
                  All previous import sessions
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                <a href="/api/admin/uploads/export">
                  <Download className="size-3.5" />
                  Export Log
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadLogs.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                    <Upload className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">No uploads yet</p>
                    <p className="text-xs text-muted-foreground">
                      Upload your first Excel graduation list above to get started.
                    </p>
                  </div>
                </div>
              ) : (
                uploadLogs.map((log) => {
                const cfg = STATUS_CONFIG[log.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PROCESSING;
                const StatusIcon = cfg.icon;
                return (
                  <div
                    key={log.id}
                    className="flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                  >
                    {/* File info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <FileSpreadsheet className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {log.fileName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Admin ·{" "}
                          {formatDistanceToNow(new Date(log.startedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Counters */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-muted/60 px-2.5 py-1 font-medium">
                        {log.totalRows.toLocaleString()} rows
                      </span>
                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-950/40 dark:text-emerald-400">
                        +{log.created.toLocaleString()} created
                      </span>
                      {log.updated > 0 && (
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 dark:border-blue-800/30 dark:bg-blue-950/40 dark:text-blue-400">
                          ~{log.updated} updated
                        </span>
                      )}
                      {log.skipped > 0 && (
                        <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/40 dark:text-amber-400">
                          {log.skipped} skipped
                        </span>
                      )}
                      {log.failed > 0 && (
                        <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-700 dark:border-red-800/30 dark:bg-red-950/40 dark:text-red-400">
                          {log.failed} failed
                        </span>
                      )}
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`flex items-center gap-1 border px-2.5 py-1 text-[10px] font-semibold ${cfg.className}`}
                      >
                        <StatusIcon className="size-3" />
                        {log.status}
                      </Badge>
                      {log.failed > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-[11px]"
                          asChild
                        >
                          <Link href={`/api/admin/uploads/${log.id}/report`}>
                            <Download className="size-3" />
                            Report
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
