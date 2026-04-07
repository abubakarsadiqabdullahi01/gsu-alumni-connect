import { DashboardHeader } from "@/components/layout/dashboard-header";
import { IDCardPreviewClient } from "@/components/profile/id-card-studio/id-card-preview-client";
import { requireAuthenticatedUser } from "@/lib/server-session";

export default async function IdCardPage() {
  await requireAuthenticatedUser();

  return (
    <>
      <DashboardHeader title="Alumni ID Card" subtitle="Enterprise-grade studio preview with premium security layers and print workflow." />
      <div className="flex-1">
        <IDCardPreviewClient />
      </div>
    </>
  );
}
