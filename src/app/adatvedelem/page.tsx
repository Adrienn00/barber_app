import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Alert } from "@/frontend/components/ui/Alert";

// /adatvedelem – adatvédelmi tájékoztató (a végleges szöveg az élesítés előtt, a 8. fázisban kerül ide)
export default function PrivacyPage() {
  return (
    <PageContainer>
      <PageHeader title="Adatvédelmi tájékoztató" />
      <Alert tone="info">A végleges szöveg az élesítés előtt kerül ide.</Alert>
    </PageContainer>
  );
}
