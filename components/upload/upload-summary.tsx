"use client";

import Link from "next/link";
import { CheckCircle2, Download, Users, RefreshCw, AlertTriangle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProgressUpdate } from "./upload-progress";

interface Props {
  updates: ProgressUpdate[];
  fileName: string;
  onNewUpload: () => void;
  duplicates?: string[];
}

export function UploadSummary({
  updates,
  fileName,
  onNewUpload,
  duplicates = [],
}: Props) {
  const totalCreated   = updates.reduce((s, u) => s + u.created,   0);
  const totalUpdated   = updates.reduce((s, u) => s + u.updated,   0);
  const totalSkipped   = updates.reduce((s, u) => s + u.skipped,   0);
  const totalFailed    = updates.reduce((s, u) => s + u.failed,    0);
  const totalProcessed = updates.reduce((s, u) => s + u.processed, 0);

  const hasErrors = totalFailed > 0 || duplicates.length > 0;

  const handleDownloadReport = () => {
    const rows: string[][] = [
      ["Sheet", "Registration No", "Status", "Reason"],
      ...duplicates.map((rn) => ["-", rn, "DUPLICATE", "Appears in multiple sheets"]),
      ...updates
        .filter((u) => u.failed > 0)
        .map((u) => [u.sheet, "-", "SHEET_ERROR", `${u.failed} rows failed`]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `upload_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = [
    {
      label: "Created",
      value: totalCreated,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800/30",
      description: "New accounts created",
    },
    {
      label: "Updated",
      value: totalUpdated,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800/30",
      description: "Existing records updated",
    },
    {
      label: "Skipped",
      value: totalSkipped,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800/30",
      description: "Duplicate or incomplete rows",
    },
    {
      label: "Failed",
      value: totalFailed,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800/30",
      description: "Could not be imported",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
          <CheckCircle2 className="size-9 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold">Import Complete!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">
              {totalProcessed.toLocaleString()}
            </span>{" "}
            records processed from{" "}
            <span className="font-semibold text-foreground">{fileName}</span>
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border p-4 text-center",
              s.bg,
              s.border
            )}
          >
            <p className={cn("text-3xl font-extrabold tabular-nums", s.color)}>
              {s.value.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-foreground">{s.label}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{s.description}</p>
          </div>
        ))}
      </div>

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
                {duplicates.length} Duplicate Registration Number
                {duplicates.length > 1 ? "s" : ""} Queued
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
                These records appear in multiple sheets and require manual review to determine
                which sheet holds the authoritative record.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {duplicates.slice(0, 5).map((rn) => (
                  <code
                    key={rn}
                    className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-mono text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  >
                    {rn}
                  </code>
                ))}
                {duplicates.length > 5 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    +{duplicates.length - 5} more
                  </span>
                )}
              </div>
              <Link
                href="/admin/graduates?filter=duplicates"
                className="mt-2 inline-block text-xs font-bold text-amber-800 underline dark:text-amber-400"
              >
                Open Review Queue →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Per-sheet summary */}
      <div className="rounded-xl border">
        <div className="border-b px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Sheet Breakdown
          </p>
        </div>
        <div className="divide-y">
          {updates.map((u) => (
            <div key={u.sheet} className="flex items-center gap-3 px-4 py-3">
              <span className="w-24 shrink-0 text-sm font-semibold">{u.sheet}</span>
              <div className="flex flex-1 flex-wrap gap-3 text-[11px]">
                <span className="text-emerald-600 font-semibold">+{u.created} created</span>
                <span className="text-blue-600 font-semibold">~{u.updated} updated</span>
                <span className="text-amber-600 font-semibold">{u.skipped} skipped</span>
                {u.failed > 0 && (
                  <span className="text-red-600 font-semibold">{u.failed} failed</span>
                )}
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">
                {u.total.toLocaleString()} rows
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/admin/graduates">
            <Users className="mr-1.5 size-4" />
            View Graduates
          </Link>
        </Button>
        {hasErrors && (
          <Button variant="outline" onClick={handleDownloadReport} className="flex-1">
            <Download className="mr-1.5 size-4" />
            Download Error Report
          </Button>
        )}
        <Button variant="outline" onClick={onNewUpload} className="flex-1">
          <RefreshCw className="mr-1.5 size-4" />
          New Upload
        </Button>
      </div>
    </div>
  );
}
