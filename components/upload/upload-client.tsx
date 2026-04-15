"use client";

import { useState } from "react";
import { ExcelUploadZone } from "./excel-upload-zone";
import { UploadPreview } from "./upload-preview";
import { UploadProgress, type ProgressUpdate } from "./upload-progress";
import { UploadSummary } from "./upload-summary";
import type { FileParseResult } from "@/lib/excel/parser";

type Stage = "upload" | "preview" | "processing" | "complete";

type ImportJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "PARTIAL_SUCCESS"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

interface ImportJobView {
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  createdRows: number;
  updatedRows: number;
  failedRows: number;
}

export function UploadClient() {
  const [stage, setStage] = useState<Stage>("upload");
  const [parseResult, setParseResult] = useState<FileParseResult | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [processingTotal, setProcessingTotal] = useState<number>(0);

  const totalRecords =
    parseResult?.sheets.reduce((sum, sheet) => sum + sheet.validRows, 0) ?? 0;

  const handleParsed = (result: FileParseResult, file: File) => {
    setParseResult(result);
    setSourceFile(file);
    setStage("preview");
  };

  const handleImport = async (selectedSheets: string[]) => {
    if (!parseResult || !sourceFile) return;
    setIsStarting(true);

    const selectedRows = parseResult.sheets
      .filter((sheet) => selectedSheets.includes(sheet.sheetName))
      .reduce((sum, sheet) => sum + sheet.validRows, 0);

    const label =
      selectedSheets.length === 1
        ? selectedSheets[0]
        : `${selectedSheets.length} selected sheets`;

    setProgressUpdates([
      {
        sheet: label,
        processed: 0,
        total: selectedRows,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        status: "processing",
      },
    ]);
    setProcessingTotal(selectedRows);
    setStage("processing");

    try {
      const form = new FormData();
      form.append("file", sourceFile);

      const uploadRes = await fetch("/api/upload/import-file", {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) {
        throw new Error(
          `Import file upload failed: ${uploadRes.status} ${uploadRes.statusText}`
        );
      }
      const uploadData = (await uploadRes.json()) as { url?: string };
      if (!uploadData.url) {
        throw new Error("Import file upload did not return a file URL.");
      }

      const createRes = await fetch("/api/import-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: parseResult.fileName,
          fileUrl: uploadData.url,
          totalRows: selectedRows,
          selectedSheets,
        }),
      });
      let jobId: string | undefined;
      if (createRes.status === 409) {
        const conflictData = (await createRes.json()) as {
          job?: { id?: string };
        };
        jobId = conflictData.job?.id;
        if (!jobId) {
          throw new Error("Import job conflict returned without active job id.");
        }
      } else if (!createRes.ok) {
        throw new Error(
          `Import job creation failed: ${createRes.status} ${createRes.statusText}`
        );
      } else {
        const createData = (await createRes.json()) as {
          job?: { id?: string };
        };
        jobId = createData.job?.id;
      }
      if (!jobId) throw new Error("Import job creation response missing job id.");

      let terminal = false;
      let pollDelayMs = 3_000;
      let lastProcessedRows = -1;
      const pollStartedAt = Date.now();
      const maxPollingDurationMs = 30 * 60 * 1_000;
      while (!terminal) {
        await new Promise((resolve) => setTimeout(resolve, pollDelayMs));

        if (Date.now() - pollStartedAt > maxPollingDurationMs) {
          throw new Error("Import polling timed out. Refresh and check job status.");
        }

        const statusRes = await fetch(`/api/import-jobs/${jobId}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!statusRes.ok) {
          throw new Error(
            `Import status polling failed: ${statusRes.status} ${statusRes.statusText}`
          );
        }

        const statusData = (await statusRes.json()) as { job?: ImportJobView };
        const job = statusData.job;
        if (!job) throw new Error("Import status response missing job payload.");

        const total = job.totalRows || selectedRows;
        const uiStatus: ProgressUpdate["status"] =
          job.status === "COMPLETED" || job.status === "PARTIAL_SUCCESS"
            ? "done"
            : job.status === "FAILED" || job.status === "CANCELLED"
              ? "error"
              : "processing";

        setProgressUpdates([
          {
            sheet: label,
            processed: Math.min(job.processedRows, total),
            total,
            created: job.createdRows,
            updated: job.updatedRows,
            skipped: 0,
            failed: job.failedRows,
            status: uiStatus,
          },
        ]);

        if (job.processedRows > lastProcessedRows) {
          pollDelayMs = 3_000;
          lastProcessedRows = job.processedRows;
        } else if (job.status === "QUEUED" || job.status === "RUNNING") {
          pollDelayMs = Math.min(10_000, pollDelayMs + 1_000);
        }

        terminal =
          job.status === "COMPLETED" ||
          job.status === "PARTIAL_SUCCESS" ||
          job.status === "FAILED" ||
          job.status === "CANCELLED";
      }
    } catch (err) {
      console.error("[upload-client] import error:", err);
      setProgressUpdates((prev) =>
        prev.map((p) => {
          const remaining = Math.max(0, p.total - p.processed);
          return {
            ...p,
            processed: p.total,
            failed: p.failed + remaining,
            status: "error" as const,
          };
        })
      );
    }

    setIsStarting(false);
    setStage("complete");
  };

  const handleReset = () => {
    setStage("upload");
    setParseResult(null);
    setSourceFile(null);
    setProgressUpdates([]);
    setProcessingTotal(0);
  };

  return (
    <>
      {stage === "upload" && <ExcelUploadZone onParsed={handleParsed} />}

      {stage === "preview" && parseResult && (
        <UploadPreview
          result={parseResult}
          onImport={handleImport}
          onReset={handleReset}
          isImporting={isStarting}
        />
      )}

      {stage === "processing" && (
        <UploadProgress updates={progressUpdates} totalRecords={processingTotal || totalRecords} />
      )}

      {stage === "complete" && parseResult && (
        <UploadSummary
          updates={progressUpdates}
          fileName={parseResult.fileName}
          onNewUpload={handleReset}
          duplicates={parseResult.duplicateRegNos}
        />
      )}
    </>
  );
}
