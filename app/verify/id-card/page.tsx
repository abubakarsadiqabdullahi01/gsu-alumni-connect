import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { verifyVerificationQuery } from "@/lib/id-card-security";

type VerifyPageProps = {
  searchParams: Promise<{ c?: string; a?: string; e?: string; s?: string }>;
};

function formatDate(value: string): string {
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

function normalizeDegreeClass(input: string | null): string {
  if (!input) return "Alumni Member";
  return input
    .split("_")
    .map((chunk) => chunk.charAt(0) + chunk.slice(1).toLowerCase())
    .join(" ");
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

export default async function VerifyIdCardPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const cardId = params.c ?? "";
  const alumniNumber = params.a ?? "";
  const expiresAtUnix = Number(params.e ?? "");
  const signature = params.s ?? "";
  const verifiedAt = new Date().toISOString();

  const verification = verifyVerificationQuery({ cardId, alumniNumber, expiresAtUnix, signature });

  const graduate = verification.ok
    ? await prisma.graduate.findUnique({
        where: { registrationNo: alumniNumber },
        select: {
          fullName: true,
          registrationNo: true,
          stateOfOrigin: true,
          graduationYear: true,
          departmentName: true,
          degreeClass: true,
          sex: true,
        },
      })
    : null;

  const status: "valid" | "expired" | "invalid" =
    verification.ok && graduate ? "valid" : verification.status === "expired" ? "expired" : "invalid";

  const statusStyles =
    status === "valid"
      ? {
          container: "border-emerald-400/50 bg-emerald-50/40",
          badge: "bg-emerald-600 text-white",
          title: "Identity Verified",
          subtitle: "This card passed integrity and validity checks.",
        }
      : status === "expired"
        ? {
            container: "border-amber-400/50 bg-amber-50/40",
            badge: "bg-amber-600 text-white",
            title: "Verification Expired",
            subtitle: "This verification URL has expired and should not be trusted.",
          }
        : {
            container: "border-destructive/40 bg-destructive/5",
            badge: "bg-destructive text-white",
            title: "Verification Failed",
            subtitle: "This credential cannot be validated.",
          };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ecfeff_0%,#f8fafc_55%,#f8fafc_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className={`border ${statusStyles.container}`}>
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Badge className={statusStyles.badge}>
                {status === "valid" ? "VALID" : status === "expired" ? "EXPIRED" : "INVALID"}
              </Badge>
              <span className="text-xs text-muted-foreground">Verified At: {formatDate(verifiedAt)}</span>
            </div>
            <CardTitle className="text-2xl">{statusStyles.title}</CardTitle>
            <CardDescription>{statusStyles.subtitle}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Credential Summary</CardTitle>
            <CardDescription>
              Public-safe identity details only. Sensitive internals and cryptographic artifacts are intentionally hidden.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <p><strong>Card Reference:</strong> {shortRef(cardId)}</p>
            <p><strong>Membership Number:</strong> {maskMembershipNumber(alumniNumber)}</p>
            <p><strong>Full Name:</strong> {graduate?.fullName ?? "Not Available"}</p>
            <p><strong>Discipline:</strong> {graduate?.departmentName ?? "Not Available"}</p>
            <p><strong>State of Origin:</strong> {graduate?.stateOfOrigin ?? "Not Available"}</p>
            <p><strong>Year of Graduation:</strong> {graduate?.graduationYear ?? "Not Available"}</p>
            <p><strong>Gender:</strong> {graduate?.sex === "F" ? "Female" : graduate?.sex === "M" ? "Male" : "Unknown"}</p>
            <p><strong>Rank:</strong> {normalizeDegreeClass(graduate?.degreeClass ?? null)}</p>
            <p><strong>Verification Expires:</strong> {Number.isFinite(expiresAtUnix) ? formatDate(new Date(expiresAtUnix * 1000).toISOString()) : "Not Available"}</p>
            <p><strong>Security Class:</strong> Enterprise Premium</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What Was Checked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Signed URL integrity (HMAC-SHA256)</p>
            <p>2. Token expiry window</p>
            <p>3. Alumni registry match</p>
            <p>4. Card status classification policy</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

