import { AdminJobDetailClient } from "@/components/admin/admin-job-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminJobDetailClient jobId={id} />;
}
