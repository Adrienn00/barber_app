import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { listMyServicesForEdit } from "@/backend/pricelist/pricelist.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { PriceListEditor } from "@/frontend/components/pricelist/PriceListEditor";
import { ROUTES } from "@/shared/config/routes";

// /beallitasok – a barber beállításai. Most: szolgáltatások (saját időtartam, ár).
// Később ide kerül: munkaidő, foglalási szabályok, profil, megbízható vendégek (7. fázis).
export default async function SettingsPage() {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const services = await listMyServicesForEdit(user.barber!.id);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Barber felület" title="Beállítások" />
      <PriceListEditor services={services} />
    </PageContainer>
  );
}
