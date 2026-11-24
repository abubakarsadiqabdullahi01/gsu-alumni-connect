"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/**
 * Stored assets are read through our own proxy, never straight from the bucket.
 *
 * The bucket sends no `Access-Control-Allow-Origin`, so fetching it from the
 * browser is blocked by CORS: the conversion to a data URL fails and the card
 * falls back to the raw remote URL. On screen that looks fine, because an
 * `<img>` may display a cross-origin image — but html2canvas cannot *draw* one,
 * so the exported PDF came out missing the photo and the signature. Going
 * through `/api/id-cards/image-proxy` makes both same-origin, and saves the
 * seconds the page spent retrying fetches that could never succeed.
 */
function absolutizePath(urlOrPath: string): string {
  if (/^https?:\/\//i.test(urlOrPath)) {
    return `/api/id-cards/image-proxy?src=${encodeURIComponent(urlOrPath)}`;
  }
  if (urlOrPath.startsWith("/")) return `${window.location.origin}${urlOrPath}`;
  return urlOrPath;
}

export function IDCardPreviewClient() {
  const [apiData, setApiData] = useState<IdCardApiResponse["data"] | null>(null);
  const [resolvedPhoto, setResolvedPhoto] = useState<string | null>(null);
  const [resolvedSignature, setResolvedSignature] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Members who activated before the CGPA/surname check existed confirm once
  // here, the first time they open their card.
  const [confirmation, setConfirmation] = useState<{ method: "cgpa" | "surname"; prompt: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      try {
        const primary = await fetch("/api/id-cards", { cache: "no-store" });
        const primaryJson = (await primary.json()) as
          | IdCardApiResponse
          | { error?: string; code?: string; method?: "cgpa" | "surname"; prompt?: string };

        if (primary.ok && "data" in primaryJson) {
          setApiData(primaryJson.data);
          return;
        }

        if (primary.status === 403 && "code" in primaryJson && primaryJson.code === "VERIFICATION_REQUIRED") {
          setConfirmation({ method: primaryJson.method ?? "cgpa", prompt: primaryJson.prompt ?? "" });
          return;
        }

        // No fallback to the specimen card. This used to drop back to sample
        // data whenever the real call failed, so a graduate could be shown —
        // and print — a card carrying a registration number that was not
        // theirs, behind nothing but a soft notice.
        setError(
          ("error" in primaryJson && primaryJson.error) ||
            "We could not load your ID card. Please refresh, and contact the Alumni Secretariat if it keeps failing."
        );
      } catch {
        setError("Failed to load card data.");
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, [reloadKey]);

  async function submitConfirmation(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) {
      setConfirmError(confirmation?.method === "surname" ? "Please enter your surname." : "Please enter your CGPA.");
      return;
    }
    setConfirming(true);
    setConfirmError("");
    try {
      const response = await fetch("/api/activation/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setConfirmError(payload.error ?? "We could not confirm that. Please try again.");
        return;
      }
      setConfirmation(null);
      setAnswer("");
      setReloadKey((k) => k + 1);
    } catch {
      setConfirmError("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

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

  if (confirmation) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="size-5 text-primary" />
            </span>
            <div>
              <p className="font-semibold text-foreground">Confirm it&apos;s you</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Your ID card is a credential others rely on, so we confirm one detail from your university
                record before issuing it. You only need to do this once.
              </p>
            </div>
          </div>
          <form onSubmit={submitConfirmation} className="flex flex-col gap-3">
            <label htmlFor="card-confirmation" className="text-sm font-semibold">
              {confirmation.method === "cgpa" ? "Your CGPA" : "Your surname"}
            </label>
            <Input
              id="card-confirmation"
              inputMode={confirmation.method === "cgpa" ? "decimal" : "text"}
              placeholder={confirmation.method === "cgpa" ? "e.g. 3.45" : "As on your university record"}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={confirming}
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{confirmation.prompt}</p>
            {confirmError ? (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {confirmError}
              </p>
            ) : null}
            <Button type="submit" disabled={confirming}>
              {confirming ? "Checking…" : "Confirm and show my card"}
            </Button>
          </form>
        </CardContent>
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
