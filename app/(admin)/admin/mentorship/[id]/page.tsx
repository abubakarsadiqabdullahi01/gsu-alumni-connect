import { AdminMentorshipDetailClient } from "@/components/admin/admin-mentorship-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminMentorshipDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminMentorshipDetailClient mentorshipId={id} />;
}
