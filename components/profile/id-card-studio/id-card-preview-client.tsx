"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { IDCardPreviewPage } from "./IDCardPreviewPage";
import { AlumniCardData, RankTier } from "./types";

type IdCardApiResponse = {
  status: "ok";
  data: {
    cardId: string;
    payload: {
      fullName: string;
      alumniNumber: string;
      stateOfOrigin: string;
      imageUrl: string;
      signatureUrl?: string;
      graduationYear: string;
      discipline: string;
      gender: string;
      rank: string;
    };
    security: {
      issuedAt: string;
      expiresAt: string;
    };
    verification?: {
      url?: string;
      token?: string;
      status?: string;
    };
  };
};

const rankAliases: Array<{ match: RegExp; rank: RankTier }> = [
  { match: /fellow/i, rank: "Fellow" },
  { match: /executive/i, rank: "Executive Member" },
  { match: /associate/i, rank: "Associate Member" },
  { match: /student/i, rank: "Student Member" },
];

function mapRank(rank: string): RankTier {
  const found = rankAliases.find((item) => item.match.test(rank));
  return found?.rank ?? "Full Member";
}

function mapGender(gender: string): "Male" | "Female" {
  return /^female$/i.test(gender) ? "Female" : "Male";
}

function serialFrom(alumniNumber: string, issuedYear: string): string {
  const compact = alumniNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const slug = compact.slice(-6) || "000000";
  const checksum = compact
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString(16)
    .toUpperCase()
    .slice(-4)
    .padStart(4, "0");
  return `GSU-SERIAL-${issuedYear}-${slug}-${checksum}`;
}

function formatMembershipNumber(registrationNo: string): string {
  const normalized = registrationNo.trim().toUpperCase();
  const pattern = /^UG(\d{2})\/([A-Z]{2})([A-Z]{2})\/(\d{4})$/;
  const match = normalized.match(pattern);

  if (!match) {
    return normalized.replaceAll("/", "");
  }

  const [, year2, faculty2, department2, serial4] = match;
  return `AM${year2}${department2}${faculty2}${serial4}`;
}

function formatGraduationYear(input: string): string {
  const normalized = input.trim();
  const years = normalized.match(/\d{4}/g);
  if (!years || years.length === 0) return normalized;
  return years[years.length - 1];
}

function absolutizePath(urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  if (urlOrPath.startsWith("/")) return `${window.location.origin}${urlOrPath}`;
  return urlOrPath;
}

export function IDCardPreviewClient() {
  const [apiData, setApiData] = useState<IdCardApiResponse["data"] | null>(null);
  const [resolvedPhoto, setResolvedPhoto] = useState<string | null>(null);
  const [resolvedSignature, setResolvedSignature] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const primary = await fetch("/api/id-cards", { cache: "no-store" });
        const primaryJson = (await primary.json()) as IdCardApiResponse | { error?: string };

        if (primary.ok && "data" in primaryJson) {
          setApiData(primaryJson.data);
          return;
        }

        const fallback = await fetch("/api/id-cards?mode=sample", { cache: "no-store" });
        const fallbackJson = (await fallback.json()) as IdCardApiResponse | { error?: string };
        if (fallback.ok && "data" in fallbackJson) {
          setApiData(fallbackJson.data);
          setError(
            "Live card data unavailable. Showing secure sample preview until your session/profile endpoint is available."
          );
          return;
        }

        const message =
          ("error" in primaryJson && primaryJson.error) ||
          ("error" in fallbackJson && fallbackJson.error) ||
          "Failed to load card data.";
        setError(message);
      } catch {
        setError("Failed to load card data.");
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, []);

  useEffect(() => {
    async function resolvePhotoAndSignature() {
      if (!apiData) return;
      const toDataUrl = async (input: string): Promise<string> => {
        const source = absolutizePath(input);
        const response = await fetch(source, { cache: "force-cache" });
        if (!response.ok) return source;
        const blob = await response.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else resolve(source);
          };
          reader.readAsDataURL(blob);
        });
      };

      try {
        const [photo, signature] = await Promise.all([
          toDataUrl(apiData.payload.imageUrl),
          toDataUrl(apiData.payload.signatureUrl ?? "/images/Signature.png"),
        ]);
        setResolvedPhoto(photo);
        setResolvedSignature(signature);
      } catch {
        setResolvedPhoto(absolutizePath(apiData.payload.imageUrl));
        setResolvedSignature(absolutizePath(apiData.payload.signatureUrl ?? "/images/Signature.png"));
      }
    }

    void resolvePhotoAndSignature();
  }, [apiData]);

  const mapped = useMemo<AlumniCardData | null>(() => {
    if (!apiData) return null;
    const issuedYear = new Date(apiData.security.issuedAt).getFullYear().toString();
    return {
      fullName: apiData.payload.fullName,
      alumniNo: formatMembershipNumber(apiData.payload.alumniNumber),
      stateOfOrigin: apiData.payload.stateOfOrigin,
      graduationYear: formatGraduationYear(apiData.payload.graduationYear),
      discipline: apiData.payload.discipline,
      gender: mapGender(apiData.payload.gender),
      rank: mapRank(apiData.payload.rank),
      photo: resolvedPhoto ?? absolutizePath(apiData.payload.imageUrl),
      signature:
        resolvedSignature ??
        absolutizePath(apiData.payload.signatureUrl ?? "/images/Signature.png"),
      qrValue: apiData.verification?.url || `${window.location.origin}/verify/id-card`,
      serialNumber: serialFrom(apiData.payload.alumniNumber, issuedYear),
      issuedYear,
      expiryLabel: "LIFETIME",
    };
  }, [apiData, resolvedPhoto, resolvedSignature]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">Loading premium ID card studio...</CardContent>
      </Card>
    );
  }

  if (error || !mapped) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error || "Unable to render card."}
        </CardContent>
      </Card>
    );
  }

  return <IDCardPreviewPage data={mapped} />;
}
