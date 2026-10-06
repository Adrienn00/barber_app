import type { Metadata } from "next";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { DraftNotice } from "@/frontend/components/legal/DraftNotice";
import { PrivacyContent } from "@/frontend/components/legal/PrivacyContent";

export const metadata: Metadata = { title: "Adatvédelmi tájékoztató" };

// /adatvedelem – adatvédelmi tájékoztató (az üzemeltető adatai: src/shared/config/legal.ts)
export default function PrivacyPage() {
  return (
    <PageContainer width="wide">
      <PageHeader title="Adatvédelmi tájékoztató" />
      <DraftNotice />
      <PrivacyContent />
    </PageContainer>
  );
}
