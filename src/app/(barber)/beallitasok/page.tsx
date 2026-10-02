import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { listMyServicesForEdit } from "@/backend/pricelist/pricelist.service";
import { getMyBookingRules, getMyWorkingWeek } from "@/backend/schedule/schedule.service";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { PriceListEditor } from "@/frontend/components/pricelist/PriceListEditor";
import { BookingRulesForm } from "@/frontend/components/schedule/BookingRulesForm";
import { WorkingHoursEditor } from "@/frontend/components/schedule/WorkingHoursEditor";
import { ROUTES } from "@/shared/config/routes";

const SECTIONS = [
  { id: "szolgaltatasok", label: "Szolgáltatások" },
  { id: "munkaido", label: "Munkaidő" },
  { id: "szabalyok", label: "Foglalási szabályok" },
];

// /beallitasok – a barber beállításai: szolgáltatások (saját időtartam, ár), munkaidő, foglalási szabályok.
// Később ide kerül: profil, megbízható vendégek (7. fázis).
export default async function SettingsPage() {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const barberId = user.barber!.id;
  const [services, week, rules] = await Promise.all([
    listMyServicesForEdit(barberId),
    getMyWorkingWeek(barberId),
    getMyBookingRules(barberId),
  ]);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Barber felület" title="Beállítások" />

      {/* Ugrás a részekhez */}
      <nav className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brass hover:text-brass"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div id="szolgaltatasok" className="scroll-mt-24">
        <PriceListEditor services={services} />
      </div>
      <div id="munkaido" className="scroll-mt-24">
        <WorkingHoursEditor initial={week} />
      </div>
      {rules && (
        <div id="szabalyok" className="scroll-mt-24">
          <BookingRulesForm initial={rules} />
        </div>
      )}
    </PageContainer>
  );
}
