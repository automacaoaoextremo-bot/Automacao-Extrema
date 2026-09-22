import { CampaignDetailClient } from "@/components/impacto-no-controle/admin/CampaignDetailClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CampaignDetailClient id={id} />;
}
