import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PresenceHeartbeat } from "@/components/shared/presence-heartbeat";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/server-session";
import { prisma } from "@/lib/db";
import { getOrCreateAdminSettings } from "@/lib/platform-settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuthenticatedUser();
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        defaultPassword: true,
        name: true,
        registrationNo: true,
      },
    }),
    getOrCreateAdminSettings(),
  ]);

  if (user?.defaultPassword) {
    redirect("/onboarding");
  }

  return (
    <SidebarProvider>
      <PresenceHeartbeat />
      <AppSidebar
        userName={user?.name ?? session.user.name ?? "User"}
        registrationNo={user?.registrationNo ?? "N/A"}
        isAdmin={session.user.role === "admin"}
        features={{
          featureJobBoard: settings.featureJobBoard,
          featureMentorship: settings.featureMentorship,
          featureMessaging: settings.featureMessaging,
          featureMap: settings.featureMap,
          featureGroups: settings.featureGroups,
        }}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
