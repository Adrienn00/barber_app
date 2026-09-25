import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Alert } from "@/frontend/components/ui/Alert";

// /aszf – felhasználási feltételek (a végleges szöveg az élesítés előtt, a 8. fázisban kerül ide)
export default function TermsPage() {
  return (
    <PageContainer>
      <PageHeader title="Felhasználási feltételek" />
      <Alert tone="info">A végleges szöveg az élesítés előtt kerül ide.</Alert>
    </PageContainer>
  );
}
