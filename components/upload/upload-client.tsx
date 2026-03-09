"use client";

import { useState } from "react";
import { ExcelUploadZone } from "./excel-upload-zone";
import { UploadPreview } from "./upload-preview";
import { UploadProgress, type ProgressUpdate } from "./upload-progress";
import { UploadSummary } from "./upload-summary";
import type { FileParseResult } from "@/lib/excel/parser";

type Stage = "upload" | "preview" | "processing" | "complete";

export function UploadClient() {
  const [stage, setStage] = useState<Stage>("upload");
  const [parseResult, setParseResult] = useState<FileParseResult | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const totalRecords =
    parseResult?.sheets.reduce((s, sh) => s + sh.validRows, 0) ?? 0;

  const handleParsed = (result: FileParseResult) => {
    setParseResult(result);
    setStage("preview");
  };

  const handleImport = async (selectedSheets: string[]) => {
    if (!parseResult) return;
    setIsStarting(true);

    const rows = parseResult.sheets
      .filter((s) => selectedSheets.includes(s.sheetName))
      .flatMap((s) => s.rows);

    const initial: ProgressUpdate[] = parseResult.sheets
      .filter((s) => selectedSheets.includes(s.sheetName))
      .map((s) => ({
        sheet: s.sheetName,
        processed: 0,
        total: s.validRows,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        status: "processing" as const,
      }));

    setProgressUpdates(initial);
    setIsStarting(false);
    setStage("processing");

    try {
      const res = await fetch("/api/graduates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          sheets: selectedSheets,
          fileName: parseResult.fileName,
        }),
      });

      if (!res.body) throw new Error("No streaming body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as ProgressUpdate;
            setProgressUpdates((prev) =>
              prev.map((p) => (p.sheet === data.sheet ? data : p))
            );
          } catch {
            // malformed chunk — skip
          }
        }
      }

      const finalChunk = buffer.trim();
      if (finalChunk.startsWith("data: ")) {
        try {
          const data = JSON.parse(finalChunk.slice(6)) as ProgressUpdate;
          setProgressUpdates((prev) =>
            prev.map((p) => (p.sheet === data.sheet ? data : p))
          );
        } catch {
          // ignore trailing malformed fragment
        }
      }
    } catch (err) {
      console.error("[upload-client] import error:", err);
      // Mark all sheets as errored
      setProgressUpdates((prev) =>
        prev.map((p) => ({ ...p, status: "error" as const }))
      );
    }

    setStage("complete");
  };

  const handleReset = () => {
    setStage("upload");
    setParseResult(null);
    setProgressUpdates([]);
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
        <UploadProgress updates={progressUpdates} totalRecords={totalRecords} />
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

// ── End of upload client ──────────────────────────────────────────────────────
