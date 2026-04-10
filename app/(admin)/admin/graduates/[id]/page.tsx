import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Eye,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function display(value: string | null | undefined, fallback = "Not available") {
  if (!value || !value.trim()) return fallback;
  return value;
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function degreeLabel(value: string | null | undefined) {
  if (!value) return "Not set";
  return value.replace(/_/g, " ");
}

export default async function AdminGraduateDetailPage({ params }: PageProps) {
  const { id } = await params;

  const graduate = await prisma.graduate.findUnique({
    where: { id },
    select: {
      id: true,
      registrationNo: true,
      fullName: true,
      facultyCode: true,
      facultyName: true,
      courseCode: true,
      departmentName: true,
      graduationYear: true,
      degreeClass: true,
      cgpa: true,
      entryYear: true,
      jambNumber: true,
      stateOfOrigin: true,
      lga: true,
      bio: true,
      profileCompleted: true,
      profileViews: true,
      onboardingStep: true,
      openToOpportunities: true,
      availableForMentorship: true,
      linkedinUrl: true,
      twitterUrl: true,
      githubUrl: true,
      personalWebsite: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          image: true,
          role: true,
          accountStatus: true,
          defaultPassword: true,
          emailVerified: true,
          lastSeenAt: true,
        },
      },
      employment: {
        orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          employmentType: true,
          isCurrent: true,
          city: true,
          state: true,
          country: true,
        },
      },
      education: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          institution: true,
          degree: true,
          fieldOfStudy: true,
          startYear: true,
          endYear: true,
          isCurrent: true,
        },
      },
      skills: {
        orderBy: [{ proficiency: "desc" }, { createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          skillName: true,
          proficiency: true,
        },
      },
      achievements: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          year: true,
          verified: true,
          createdAt: true,
        },
      },
      badges: {
        orderBy: { awardedAt: "desc" },
        take: 12,
        select: {
          id: true,
          badgeType: true,
          awardedAt: true,
        },
      },
      _count: {
        select: {
          employment: true,
          education: true,
          skills: true,
          achievements: true,
          badges: true,
          groupMemberships: true,
          jobApplications: true,
        },
      },
    },
  });

  if (!graduate) {
    notFound();
  }

  const [acceptedConnections, pendingConnections] = await Promise.all([
    prisma.connection.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: id }, { receiverId: id }],
      },
    }),
    prisma.connection.count({
      where: {
        status: "PENDING",
        OR: [{ requesterId: id }, { receiverId: id }],
      },
    }),
  ]);

  const completionLabel = graduate.profileCompleted ? "Complete" : `Step ${graduate.onboardingStep}/5`;

  return (
    <>
      <DashboardHeader title="Graduate Details" subtitle="Administrative profile view and engagement metrics" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/graduates">
              <ArrowLeft className="mr-2 size-4" />
              Back to Graduates
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/directory/${graduate.id}`}>
              Public Profile
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700" />
          <CardContent className="-mt-10 space-y-4 p-6">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar className="size-20 border-4 border-background shadow-sm">
                <AvatarImage src={graduate.user.image ?? undefined} alt={graduate.fullName} />
                <AvatarFallback className="text-lg font-semibold">{initials(graduate.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold">{graduate.fullName}</h1>
                <p className="font-mono text-sm text-muted-foreground">{graduate.registrationNo}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{graduate.user.accountStatus}</Badge>
                  {graduate.graduationYear ? <Badge variant="secondary">{graduate.graduationYear}</Badge> : null}
                  <Badge variant="outline">{degreeLabel(graduate.degreeClass)}</Badge>
                  <Badge variant={graduate.profileCompleted ? "default" : "secondary"}>{completionLabel}</Badge>
                  {graduate.availableForMentorship ? <Badge variant="outline">Mentor Ready</Badge> : null}
                  {graduate.openToOpportunities ? <Badge>Open to Work</Badge> : null}
                </div>
              </div>
            </div>
            {graduate.bio ? <p className="text-sm text-muted-foreground">{graduate.bio}</p> : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Eye className="size-4" /> Profile Views</CardDescription>
              <CardTitle className="text-2xl">{graduate.profileViews.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Users className="size-4" /> Connections</CardDescription>
              <CardTitle className="text-2xl">{acceptedConnections.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">{pendingConnections.toLocaleString()} pending</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Sparkles className="size-4" /> Achievements</CardDescription>
              <CardTitle className="text-2xl">{graduate._count.achievements.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">{graduate.badges.length} recent badges loaded</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><BriefcaseBusiness className="size-4" /> Career Entries</CardDescription>
              <CardTitle className="text-2xl">{graduate._count.employment.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">{graduate._count.jobApplications.toLocaleString()} job applications</CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GraduationCap className="size-4 text-primary" /> Academic Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Faculty</span><p className="font-medium">{display(graduate.facultyName)}</p></div>
                <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Department</span><p className="font-medium">{display(graduate.departmentName)}</p></div>
                <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Faculty Code</span><p className="font-medium">{display(graduate.facultyCode)}</p></div>
                <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Course Code</span><p className="font-medium">{display(graduate.courseCode)}</p></div>
                <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">Entry Year</span><p className="font-medium">{graduate.entryYear ?? "Not available"}</p></div>
                <div className="rounded-md border p-3 text-sm"><span className="text-muted-foreground">CGPA</span><p className="font-medium">{graduate.cgpa ? graduate.cgpa.toString() : "Not available"}</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="size-4 text-primary" /> Employment ({graduate._count.employment})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {graduate.employment.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employment records.</p>
                ) : (
                  graduate.employment.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <p className="text-sm font-semibold">{item.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{item.companyName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{display(item.city, "Unknown city")}, {display(item.state, "Unknown state")} - {display(item.country, "Nigeria")}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline">{item.employmentType.replace(/_/g, " ")}</Badge>
                        {item.isCurrent ? <Badge>Current</Badge> : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Education ({graduate._count.education})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {graduate.education.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No education records.</p>
                ) : (
                  graduate.education.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <p className="text-sm font-semibold">{item.institution}</p>
                      <p className="text-xs text-muted-foreground">
                        {display(item.degree, "Degree not set")}
                        {item.fieldOfStudy ? ` - ${item.fieldOfStudy}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.startYear ?? "?"} - {item.isCurrent ? "Present" : item.endYear ?? "?"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account & Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-md border p-3"><p className="flex items-center gap-2 text-muted-foreground"><Mail className="size-3.5" /> Email</p><p className="font-medium">{display(graduate.user.email)}</p></div>
                <div className="rounded-md border p-3"><p className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" /> Phone</p><p className="font-medium">{display(graduate.user.phone)}</p></div>
                <div className="rounded-md border p-3"><p className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-3.5" /> State / LGA</p><p className="font-medium">{display(graduate.stateOfOrigin)} / {display(graduate.lga)}</p></div>
                <div className="rounded-md border p-3"><p className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="size-3.5" /> Security</p><p className="font-medium">{graduate.user.emailVerified ? "Email verified" : "Email not verified"} - {graduate.user.defaultPassword ? "Default password" : "Password changed"}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Last Seen</p><p className="font-medium">{formatDate(graduate.user.lastSeenAt)}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Imported On</p><p className="font-medium">{formatDate(graduate.createdAt)}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">Last Updated</p><p className="font-medium">{formatDate(graduate.updatedAt)}</p></div>
                <div className="rounded-md border p-3"><p className="text-muted-foreground">JAMB Number</p><p className="font-medium">{display(graduate.jambNumber)}</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Link2 className="size-4 text-primary" /> Links & Identity</CardTitle>
                <CardDescription>Profile links, badges and engagement tags.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-3 text-sm"><p className="text-muted-foreground">LinkedIn</p><p className="font-medium break-all">{display(graduate.linkedinUrl)}</p></div>
                <div className="rounded-md border p-3 text-sm"><p className="text-muted-foreground">Twitter</p><p className="font-medium break-all">{display(graduate.twitterUrl)}</p></div>
                <div className="rounded-md border p-3 text-sm"><p className="text-muted-foreground">GitHub</p><p className="font-medium break-all">{display(graduate.githubUrl)}</p></div>
                <div className="rounded-md border p-3 text-sm"><p className="text-muted-foreground">Website</p><p className="font-medium break-all">{display(graduate.personalWebsite)}</p></div>

                <div className="pt-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Badges</p>
                  {graduate.badges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No badges yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {graduate.badges.map((badge) => (
                        <Badge key={badge.id} variant="secondary">
                          <BadgeCheck className="mr-1 size-3" />
                          {badge.badgeType.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="size-4 text-primary" /> Skills ({graduate._count.skills})</CardTitle>
              </CardHeader>
              <CardContent>
                {graduate.skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {graduate.skills.map((skill) => (
                      <Badge key={skill.id} variant="outline">
                        {skill.skillName} ({skill.proficiency})
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {graduate.achievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No achievements submitted.</p>
                ) : (
                  graduate.achievements.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.year ?? "Year not set"} - {formatDate(item.createdAt)}
                      </p>
                      <Badge className="mt-2" variant={item.verified ? "default" : "secondary"}>
                        {item.verified ? "Verified" : "Pending Review"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
