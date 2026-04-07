"use client";

import { useCallback, useRef, useState } from "react";
import { buildPDFFilename, generateCardPDF } from "@/lib/generateCardPDF";
import type { AlumniCardData } from "@/components/profile/id-card-studio/types";

export function useCardPDF(data: AlumniCardData, cropMarks = false) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadPDF = useCallback(async () => {
    if (!frontRef.current || !backRef.current) {
      setError("Card elements not ready. Please try again.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      await generateCardPDF({
        frontEl: frontRef.current,
        backEl: backRef.current,
        filename: buildPDFFilename(data.fullName, data.alumniNo),
        memberName: data.fullName,
        showCropMarks: cropMarks,
      });
    } catch (err) {
      console.error("[useCardPDF] PDF generation failed:", err);
      setError("PDF generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [cropMarks, data.alumniNo, data.fullName]);

  return { frontRef, backRef, isGenerating, error, downloadPDF };
}
