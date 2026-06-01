import { redirect } from "next/navigation";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/meetings/${id}/analysis`);
}
