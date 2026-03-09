import { AdminGroupDetailClient } from "@/components/admin/admin-group-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminGroupDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminGroupDetailClient groupId={id} />;
}

