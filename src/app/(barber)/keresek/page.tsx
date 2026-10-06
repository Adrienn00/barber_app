import type { Metadata } from "next";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { listPendingRequests } from "@/backend/requests/requests.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { RequestCard } from "@/frontend/components/requests/RequestCard";
import { Alert } from "@/frontend/components/ui/Alert";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Függő kérések" };

// /keresek – a barber jóváhagyásra váró foglalási kérései, időrendben.
// Élőben frissül: a fejlécben lévő LiveRefresh újratölti, ha új kérés jön vagy lejár egy.
export default async function RequestsPage() {
  const user = await requireApprovedBarber(ROUTES.barberRequests);
  const barberId = user.barber!.id;
  const requests = await listPendingRequests(barberId);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Barber felület" title="Függő kérések" />
      {requests.length === 0 ? (
        <Alert tone="info">Nincs jóváhagyásra váró kérés. Ha új érkezik, itt azonnal megjelenik.</Alert>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
