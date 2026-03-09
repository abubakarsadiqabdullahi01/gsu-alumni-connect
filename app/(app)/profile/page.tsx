import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuthenticatedUser } from "@/lib/server-session";
import { prisma } from "@/lib/db";
import { ProfileEditor } from "@/components/profile/profile-editor";

function asDateInput(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export default async function ProfilePage() {
  const session = await requireAuthenticatedUser();

  const graduate = await prisma.graduate.findUnique({
    where: { userId: session.user.id },
    select: {
      fullName: true,
      registrationNo: true,
      departmentName: true,
      facultyName: true,
      graduationYear: true,
      degreeClass: true,
      dateOfBirth: true,
      bio: true,
      linkedinUrl: true,
      twitterUrl: true,
      githubUrl: true,
      personalWebsite: true,
      nyscState: true,
      nyscYear: true,
      openToOpportunities: true,
      availableForMentorship: true,
      employment: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          employmentType: true,
          isCurrent: true,
        },
      },
      education: {
        orderBy: { createdAt: "desc" },
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
        select: {
          id: true,
          skillName: true,
          proficiency: true,
        },
      },
      user: {
        select: {
          accountStatus: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!graduate) {
    return (
      <>
        <DashboardHeader title="My Profile" />
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile not available</CardTitle>
              <CardDescription>Your graduate profile is not linked yet. Contact admin support.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader title="My Profile" />
      <div className="flex-1 p-4 md:p-6">
        <ProfileEditor
          initialData={{
            fullName: graduate.fullName,
            registrationNo: graduate.registrationNo,
            departmentName: graduate.departmentName,
            facultyName: graduate.facultyName,
            graduationYear: graduate.graduationYear,
            degreeClass: graduate.degreeClass,
            accountStatus: graduate.user.accountStatus,
            email: graduate.user.email,
            phone: graduate.user.phone,
            dateOfBirth: asDateInput(graduate.dateOfBirth),
            bio: graduate.bio,
            linkedinUrl: graduate.linkedinUrl,
            twitterUrl: graduate.twitterUrl,
            githubUrl: graduate.githubUrl,
            personalWebsite: graduate.personalWebsite,
            nyscState: graduate.nyscState,
            nyscYear: graduate.nyscYear,
            openToOpportunities: graduate.openToOpportunities,
            availableForMentorship: graduate.availableForMentorship,
            employment: graduate.employment,
            education: graduate.education,
            skills: graduate.skills,
          }}
        />
      </div>
    </>
  );
}
