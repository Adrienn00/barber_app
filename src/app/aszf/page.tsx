import type { Metadata } from "next";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { DraftNotice } from "@/frontend/components/legal/DraftNotice";
import { TermsContent } from "@/frontend/components/legal/TermsContent";

export const metadata: Metadata = { title: "Felhasználási feltételek" };

// /aszf – felhasználási feltételek (az üzemeltető adatai: src/shared/config/legal.ts)
export default function TermsPage() {
  return (
    <PageContainer width="wide">
      <PageHeader title="Felhasználási feltételek" />
      <DraftNotice />
      <TermsContent />
    </PageContainer>
  );
}
