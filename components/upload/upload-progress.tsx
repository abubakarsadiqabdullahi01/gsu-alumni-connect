"use client";

import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ProgressUpdate {
  sheet: string;
  processed: number;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  status: "processing" | "done" | "error";
}

interface Props {
  updates: ProgressUpdate[];
  totalRecords: number;
}

export function UploadProgress({ updates, totalRecords }: Props) {
  const totalProcessed = updates.reduce((s, u) => s + u.processed, 0);
  const totalCreated   = updates.reduce((s, u) => s + u.created,   0);
  const totalUpdated   = updates.reduce((s, u) => s + u.updated,   0);
  const totalSkipped   = updates.reduce((s, u) => s + u.skipped,   0);
  const totalFailed    = updates.reduce((s, u) => s + u.failed,    0);
  const pct = totalRecords > 0 ? Math.round((totalProcessed / totalRecords) * 100) : 0;

  const counters = [
    { label: "Created", value: totalCreated, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/30" },
    { label: "Updated", value: totalUpdated, color: "text-blue-600",    bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800/30"    },
    { label: "Skipped", value: totalSkipped, color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800/30"  },
    { label: "Failed",  value: totalFailed,  color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-200 dark:border-red-800/30"      },
  ];

  return (
    <div className="space-y-5">
      {/* Overall progress */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Importing Records</p>
            <p className="text-xs text-muted-foreground">
              {totalProcessed.toLocaleString()} of {totalRecords.toLocaleString()} processed
            </p>
          </div>
          <span className="text-3xl font-extrabold tabular-nums text-primary">{pct}%</span>
        </div>
        <Progress value={pct} className="h-3 rounded-full" />
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counters.map((c) => (
          <div
            key={c.label}
            className={cn("rounded-xl border p-4 text-center transition-all", c.bg, c.border)}
          >
            <p className={cn("text-2xl font-extrabold tabular-nums", c.color)}>
              {c.value.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Per-sheet rows */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Sheet Progress
        </p>
        {updates.map((u) => {
          const sp = u.total > 0 ? Math.round((u.processed / u.total) * 100) : 0;
          return (
            <div key={u.sheet} className="rounded-xl border p-4">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {u.status === "done" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : u.status === "error" ? (
                    <AlertCircle className="size-4 shrink-0 text-red-500" />
                  ) : (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  )}
                  <span className="text-sm font-semibold">{u.sheet}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="font-bold text-emerald-600">+{u.created.toLocaleString()}</span>
                  <span className="font-bold text-blue-600">~{u.updated.toLocaleString()}</span>
                  {u.failed > 0 && (
                    <span className="font-bold text-red-600">✕{u.failed}</span>
                  )}
                  <span className="font-semibold text-muted-foreground">{sp}%</span>
                </div>
              </div>
              <Progress value={sp} className="h-1.5 rounded-full" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
