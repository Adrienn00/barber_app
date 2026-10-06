import type { Metadata } from "next";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { listOpenReschedules, listPendingRequests } from "@/backend/requests/requests.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { RequestCard } from "@/frontend/components/requests/RequestCard";
import { RescheduleCard } from "@/frontend/components/requests/RescheduleCard";
import { Alert } from "@/frontend/components/ui/Alert";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Függő kérések" };

// /keresek – a barber teendői: új foglalási kérések, áthelyezés utáni döntések, a vendég válaszára váró javaslatok.
// Élőben frissül: a fejlécben lévő LiveRefresh újratölti, ha valami változik.
export default async function RequestsPage() {
  const user = await requireApprovedBarber(ROUTES.barberRequests);
  const barberId = user.barber!.id;
  const [requests, reschedules] = await Promise.all([listPendingRequests(barberId), listOpenReschedules(barberId)]);
  const decisions = reschedules.filter((r) => r.needsDecision);
  const waiting = reschedules.filter((r) => !r.needsDecision);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Barber felület" title="Függő kérések" />

      {decisions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Döntésre vár</h2>
          <p className="text-muted">A vendég nem fogadta el az új időpontot, vagy nem válaszolt időben. A régi időpont addig él.</p>
          {decisions.map((r) => (
            <RescheduleCard key={r.id} item={r} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Új foglalási kérések</h2>
        {requests.length === 0 ? (
          <Alert tone="info">Nincs jóváhagyásra váró kérés. Ha új érkezik, itt azonnal megjelenik.</Alert>
        ) : (
          requests.map((r) => <RequestCard key={r.id} request={r} />)
        )}
      </section>

      {waiting.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Áthelyezés – a vendég válaszára vár</h2>
          {waiting.map((r) => (
            <RescheduleCard key={r.id} item={r} />
          ))}
        </section>
      )}
    </PageContainer>
  );
}
