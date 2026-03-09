"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { FileParseResult, SheetParseResult } from "@/lib/excel/parser";

const ERA_STYLE: Record<string, { label: string; className: string }> = {
  LEGACY:  { label: "Legacy 2009–2012",  className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/30" },
  MID_ERA: { label: "Mid-Era 2013–2019", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/30" },
  MODERN:  { label: "Modern 2021–2024",  className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/30" },
};

interface Props {
  result: FileParseResult;
  onImport: (selectedSheets: string[]) => void;
  onReset: () => void;
  isImporting: boolean;
}

export function UploadPreview({ result, onImport, onReset, isImporting }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(result.sheets.map((s) => s.sheetName))
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const selectedRows = result.sheets
    .filter((s) => selected.has(s.sheetName))
    .reduce((n, s) => n + s.validRows, 0);

  return (
    <div className="space-y-5">
      {/* File header */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FileSpreadsheet className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-bold">{result.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {result.sheets.length} sheets · {result.totalRecords.toLocaleString()} records
            {result.duplicateRegNos.length > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · {result.duplicateRegNos.length} cross-sheet duplicates
              </span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="shrink-0 text-xs">
          <RotateCcw className="mr-1.5 size-3" />
          Change
        </Button>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-1.5">
          {result.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Sheet selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Detected Sheets
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setSelected(new Set(result.sheets.map((s) => s.sheetName)))}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => setSelected(new Set())}
            >
              None
            </Button>
          </div>
        </div>

        {result.sheets.map((sheet) => {
          const era = ERA_STYLE[sheet.era];
          const isExpanded = expanded === sheet.sheetName;
          const isSelected = selected.has(sheet.sheetName);

          return (
            <div
              key={sheet.sheetName}
              className={cn(
                "overflow-hidden rounded-xl border transition-all",
                isSelected ? "border-border" : "border-border/40 opacity-55"
              )}
            >
              <div className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(sheet.sheetName)}
                  id={`sheet-${sheet.sheetName}`}
                />
                <label
                  htmlFor={`sheet-${sheet.sheetName}`}
                  className="flex flex-1 cursor-pointer items-center gap-2 text-sm font-bold"
                >
                  {sheet.sheetName}
                </label>
                <Badge className={cn("border text-[10px]", era.className)}>
                  {era.label}
                </Badge>
                {sheet.errors.length > 0 && (
                  <Badge className="border border-red-200 bg-red-50 text-[10px] text-red-700 dark:border-red-800/30 dark:bg-red-950/40 dark:text-red-400">
                    {sheet.errors.length} errors
                  </Badge>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    <span className="font-bold text-foreground">
                      {sheet.validRows.toLocaleString()}
                    </span>{" "}
                    valid
                  </span>
                  {sheet.errors.length > 0 && (
                    <span className="text-red-500">{sheet.errors.length} failed</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : sheet.sheetName)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  {/* Sample rows */}
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sample Records
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {sheet.rows.slice(0, 6).map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-[11px]"
                        >
                          <span className="font-mono font-semibold text-primary">
                            {row.registrationNo}
                          </span>
                          <span className="font-medium">{row.fullName}</span>
                          {row.courseCode && (
                            <span className="text-muted-foreground">{row.courseCode}</span>
                          )}
                          {row.degreeClass && (
                            <Badge variant="outline" className="h-4 px-1 text-[9px]">
                              {row.degreeClass.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Errors */}
                  {sheet.errors.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-red-600">
                        Row Errors
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {sheet.errors.slice(0, 8).map((e, i) => (
                          <p key={i} className="text-[11px] text-red-600">
                            Row {e.row}: {e.reason}
                          </p>
                        ))}
                        {sheet.errors.length > 8 && (
                          <p className="text-[11px] text-muted-foreground">
                            +{sheet.errors.length - 8} more…
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          <span className="font-bold text-foreground">{selected.size}</span> of{" "}
          {result.sheets.length} sheets selected
        </span>
        <span className="font-bold">
          {selectedRows.toLocaleString()} records to import
        </span>
      </div>

      {/* Import button */}
      <Button
        onClick={() => onImport([...selected])}
        disabled={selected.size === 0 || isImporting}
        size="lg"
        className="w-full rounded-xl"
      >
        {isImporting ? (
          <span className="flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Starting import…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Import {selectedRows.toLocaleString()} Records
            <ArrowRight className="size-4" />
          </span>
        )}
      </Button>
    </div>
  );
}
