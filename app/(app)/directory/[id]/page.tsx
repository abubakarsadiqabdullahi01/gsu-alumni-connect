import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Calendar,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Shield,
  UserRound,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthenticatedUser } from "@/lib/server-session";
import { prisma } from "@/lib/db";

type Params = { id: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function display(value: string | null | undefined, fallback = "Not available") {
  if (!value || !value.trim()) return fallback;
  return value;
}

export default async function DirectoryProfilePage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const session = await requireAuthenticatedUser();

  const graduate = await prisma.graduate.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      registrationNo: true,
      fullName: true,
      facultyName: true,
      departmentName: true,
      graduationYear: true,
      degreeClass: true,
      cgpa: true,
      stateOfOrigin: true,
      bio: true,
      showInDirectory: true,
      showEmail: true,
      showPhone: true,
      showDob: true,
      showCgpa: true,
      dateOfBirth: true,
      linkedinUrl: true,
      openToOpportunities: true,
      availableForMentorship: true,
      employment: {
        orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          isCurrent: true,
        },
      },
      education: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          institution: true,
          degree: true,
          fieldOfStudy: true,
          isCurrent: true,
        },
      },
      skills: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          skillName: true,
          proficiency: true,
        },
      },
      user: {
        select: {
          image: true,
          email: true,
          phone: true,
          accountStatus: true,
        },
      },
    },
  });

  if (!graduate) {
    notFound();
  }

  const isSelf = session.user.id === graduate.userId;
  const isAdmin = session.user.role === "admin";
  const canBypassPrivacy = isSelf || isAdmin;

  if (!graduate.showInDirectory && !canBypassPrivacy) {
    notFound();
  }

  const canSeeEmail = canBypassPrivacy || graduate.showEmail;
  const canSeePhone = canBypassPrivacy || graduate.showPhone;
  const canSeeDob = canBypassPrivacy || graduate.showDob;
  const canSeeCgpa = canBypassPrivacy || graduate.showCgpa;

  return (
    <>
      <DashboardHeader title="Alumni Profile" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Alumni Details</h1>
            <p className="text-sm text-muted-foreground">
              Full public profile view with privacy-controlled personal fields.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/directory">
              <ArrowLeft className="mr-2 size-4" />
              Back to Directory
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden border-primary/20">
          <div className="h-24 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />
          <CardContent className="space-y-4 px-6 pb-6 pt-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar className="size-20 border-4 border-background">
                <AvatarImage src={graduate.user.image ?? undefined} alt={graduate.fullName} />
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {initials(graduate.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-extrabold tracking-tight">{graduate.fullName}</h1>
                <p className="pt-0.5 text-sm text-muted-foreground">{graduate.registrationNo}</p>
                <p className="text-sm text-muted-foreground">
                  {display(graduate.facultyName)} / {display(graduate.departmentName)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{graduate.user.accountStatus}</Badge>
                  {graduate.graduationYear ? <Badge variant="secondary">{graduate.graduationYear}</Badge> : null}
                  {graduate.degreeClass ? <Badge variant="outline">{graduate.degreeClass.replace(/_/g, " ")}</Badge> : null}
                  {graduate.openToOpportunities ? <Badge>Open to Work</Badge> : null}
                  {graduate.availableForMentorship ? (
                    <Badge variant="outline">
                      <BadgeCheck className="mr-1 size-3" />
                      Mentor
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            {graduate.bio ? <p className="text-sm leading-relaxed text-muted-foreground">{graduate.bio}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="size-4 text-primary" />
                  Employment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {graduate.employment.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employment details shared.</p>
                ) : (
                  graduate.employment.map((emp) => (
                    <div key={emp.id} className="rounded-md border p-3">
                      <p className="text-sm font-semibold">{emp.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{emp.companyName}</p>
                      {emp.isCurrent ? <Badge className="mt-2 text-[10px]">Current</Badge> : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {graduate.education.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No education details shared.</p>
                ) : (
                  graduate.education.map((edu) => (
                    <div key={edu.id} className="rounded-md border p-3">
                      <p className="text-sm font-semibold">{edu.institution}</p>
                      <p className="text-xs text-muted-foreground">
                        {(edu.degree ?? "Degree not set") + (edu.fieldOfStudy ? ` - ${edu.fieldOfStudy}` : "")}
                      </p>
                      {edu.isCurrent ? <Badge className="mt-2 text-[10px]">Current</Badge> : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="size-4 text-primary" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {graduate.skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills shared.</p>
                ) : (
                  graduate.skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary">
                      {skill.skillName} ({skill.proficiency})
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact & Profile Visibility</CardTitle>
                <CardDescription>Fields are shown based on this user's privacy settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-3.5" />
                    Email
                  </p>
                  <p className="font-medium">{canSeeEmail ? display(graduate.user.email) : "Hidden by user"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5" />
                    Phone
                  </p>
                  <p className="font-medium">{canSeePhone ? display(graduate.user.phone) : "Hidden by user"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-3.5" />
                    Date of Birth
                  </p>
                  <p className="font-medium">
                    {canSeeDob && graduate.dateOfBirth
                      ? new Date(graduate.dateOfBirth).toLocaleDateString()
                      : canSeeDob
                        ? "Not available"
                        : "Hidden by user"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="size-3.5" />
                    CGPA
                  </p>
                  <p className="font-medium">{canSeeCgpa ? (graduate.cgpa ? graduate.cgpa.toString() : "Not available") : "Hidden by user"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5" />
                    State of Origin
                  </p>
                  <p className="font-medium">{display(graduate.stateOfOrigin)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-muted-foreground">LinkedIn</p>
                  <p className="font-medium">{display(graduate.linkedinUrl)}</p>
                </div>
              </CardContent>
            </Card>

            {!canBypassPrivacy ? (
              <Alert>
                <AlertDescription>
                  Some fields may be hidden according to this alumni member's privacy preferences.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
