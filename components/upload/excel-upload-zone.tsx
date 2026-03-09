"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseExcelFile, type FileParseResult } from "@/lib/excel/parser";

interface Props {
  onParsed: (result: FileParseResult) => void;
}

export function ExcelUploadZone({ onParsed }: Props) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      setError("Only Excel files (.xlsx, .xls) are accepted.");
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: parsing,
  });

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const result = await parseExcelFile(file);
      onParsed(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file. Please check the format.");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200",
          isDragActive
            ? "border-primary bg-primary/8 scale-[1.01] shadow-lg shadow-primary/10"
            : file
              ? "border-primary/50 bg-primary/4"
              : "border-border hover:border-primary/40 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />

        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {file ? (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <FileSpreadsheet className="size-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB · Ready to parse
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setError(null);
              }}
            >
              <X className="mr-1 size-3" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-2xl transition-all duration-200",
                isDragActive ? "bg-primary/20 scale-110" : "bg-muted"
              )}
            >
              <Upload
                className={cn(
                  "size-8 transition-colors",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {isDragActive ? "Release to upload…" : "Drag & drop your Excel file here"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                .xlsx or .xls · All 13 graduation sheets (2009–2024) supported
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {/* Supported formats hint */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
        {["Legacy (2009–2012)", "Mid-Era (2013–2019)", "Modern (2021–2024)"].map((e) => (
          <span
            key={e}
            className="flex items-center gap-1 rounded-full border px-2.5 py-0.5"
          >
            <CheckCircle2 className="size-2.5 text-emerald-500" />
            {e}
          </span>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Parse button */}
      {file && (
        <Button
          onClick={handleParse}
          disabled={parsing}
          size="lg"
          className="w-full rounded-xl"
        >
          {parsing ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Parsing sheets…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="size-4" />
              Parse & Preview
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
