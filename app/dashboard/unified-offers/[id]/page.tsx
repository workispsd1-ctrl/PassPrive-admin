import { UnifiedOfferEditorPage } from "@/app/dashboard/_components/unified-offers/OfferEditorPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UnifiedOfferEditorPage offerId={id} />;
}
