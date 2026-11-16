import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  readVerificationParams,
  resolveCardVerification,
  type CardVerificationStatus,
} from "@/lib/id-card-verification";

type VerifyPageProps = {
  searchParams: Promise<{ c?: string; a?: string; e?: string; s?: string }>;
};

function formatDate(value: string | null): string {
  if (!value) return "Not Available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function maskMembershipNumber(value: string): string {
  if (!value) return "Not Available";
  if (value.length <= 6) return value;
  const visiblePrefix = value.slice(0, 4);
  const visibleSuffix = value.slice(-4);
  return `${visiblePrefix}${"*".repeat(Math.max(0, value.length - 8))}${visibleSuffix}`;
}

function shortRef(value: string): string {
  if (!value) return "Not Available";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

const PRESENTATION: Record<
  CardVerificationStatus,
  { label: string; container: string; badge: string; title: string; subtitle: string }
> = {
  valid: {
    label: "VALID",
    container: "border-emerald-400/50 bg-emerald-50/40",
    badge: "bg-emerald-600 text-white",
    title: "Identity Verified",
    subtitle: "This card passed integrity and validity checks.",
  },
  expired: {
    label: "EXPIRED",
    container: "border-amber-400/50 bg-amber-50/40",
    badge: "bg-amber-600 text-white",
    title: "Card Expired",
    subtitle: "This card is past its validity date and should not be accepted.",
  },
  revoked: {
    label: "REVOKED",
    container: "border-destructive/40 bg-destructive/5",
    badge: "bg-destructive text-white",
    title: "Card Revoked",
    subtitle: "The Alumni Secretariat has withdrawn this card.",
  },
  invalid: {
    label: "INVALID",
    container: "border-destructive/40 bg-destructive/5",
    badge: "bg-destructive text-white",
    title: "Verification Failed",
    subtitle: "This credential cannot be validated.",
  },
};

export default async function VerifyIdCardPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const verifiedAt = new Date().toISOString();

  const verification = await resolveCardVerification(
    readVerificationParams((key) => params[key as "c" | "a" | "e" | "s"] ?? null)
  );

  const presentation = PRESENTATION[verification.status];
  const details = verification.data;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ecfeff_0%,#f8fafc_55%,#f8fafc_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className={`border ${presentation.container}`}>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Badge className={presentation.badge}>{presentation.label}</Badge>
              <span className="text-xs text-muted-foreground">Verified At: {formatDate(verifiedAt)}</span>
            </div>
            <CardTitle className="text-2xl">{presentation.title}</CardTitle>
            <CardDescription>{verification.reason ?? presentation.subtitle}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Credential Summary</CardTitle>
            <CardDescription>
              Public-safe identity details only. Sensitive internals and cryptographic artifacts are
              intentionally hidden.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <p><strong>Card Reference:</strong> {shortRef(details?.cardId ?? "")}</p>
            <p><strong>Membership Number:</strong> {maskMembershipNumber(details?.alumniNumber ?? "")}</p>
            <p><strong>Full Name:</strong> {details?.fullName ?? "Not Available"}</p>
            <p><strong>Discipline:</strong> {details?.discipline ?? "Not Available"}</p>
            <p><strong>State of Origin:</strong> {details?.stateOfOrigin ?? "Not Available"}</p>
            <p><strong>Year of Graduation:</strong> {details?.graduationYear ?? "Not Available"}</p>
            <p><strong>Gender:</strong> {details?.gender ?? "Unknown"}</p>
            <p><strong>Rank:</strong> {details?.rank ?? "Not Available"}</p>
            <p><strong>Issued:</strong> {formatDate(verification.issuedAt)}</p>
            <p><strong>Card Expires:</strong> {formatDate(verification.expiresAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What Was Checked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Signed link integrity (HMAC-SHA256)</p>
            <p>2. Card issued by the Alumni Secretariat</p>
            <p>3. Card validity dates</p>
            <p>4. Revocation status</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
