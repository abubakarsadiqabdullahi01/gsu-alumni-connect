import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { prisma } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/server-session";

export default async function SettingsPage() {
  const session = await requireAuthenticatedUser();

  const graduate = await prisma.graduate.findUnique({
    where: { userId: session.user.id },
    select: {
      fullName: true,
      registrationNo: true,
      showCgpa: true,
      showEmail: true,
      showPhone: true,
      showDob: true,
      showInDirectory: true,
      allowMessages: true,
      showActivityFeed: true,
      openToOpportunities: true,
      availableForMentorship: true,
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
        <DashboardHeader title="Settings" />
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
      <DashboardHeader title="Settings" />
      <div className="flex-1 p-4 md:p-6">
        <SettingsForm
          initialData={{
            accountStatus: graduate.user.accountStatus,
            registrationNo: graduate.registrationNo,
            fullName: graduate.fullName,
            email: graduate.user.email,
            phone: graduate.user.phone,
            showCgpa: graduate.showCgpa,
            showEmail: graduate.showEmail,
            showPhone: graduate.showPhone,
            showDob: graduate.showDob,
            showInDirectory: graduate.showInDirectory,
            allowMessages: graduate.allowMessages,
            showActivityFeed: graduate.showActivityFeed,
            openToOpportunities: graduate.openToOpportunities,
            availableForMentorship: graduate.availableForMentorship,
          }}
        />
      </div>
    </>
  );
}

