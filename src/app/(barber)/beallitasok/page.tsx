import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { saveBarberProfileAction } from "@/backend/barbers/barbers.actions";
import { getMyBarberApplication } from "@/backend/barbers/barbers.service";
import { listMyCustomers } from "@/backend/customers/customers.service";
import { listMyServicesForEdit } from "@/backend/pricelist/pricelist.service";
import { getMyBookingRules, getMyWorkingWeek } from "@/backend/schedule/schedule.service";
import { AvatarUpload } from "@/frontend/components/barber/AvatarUpload";
import { BarberApplicationForm } from "@/frontend/components/barber/BarberApplicationForm";
import { ListingToggle } from "@/frontend/components/barber/ListingToggle";
import { CustomerList } from "@/frontend/components/customers/CustomerList";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { PriceListEditor } from "@/frontend/components/pricelist/PriceListEditor";
import { BookingRulesForm } from "@/frontend/components/schedule/BookingRulesForm";
import { WorkingHoursEditor } from "@/frontend/components/schedule/WorkingHoursEditor";
import { Card } from "@/frontend/components/ui/Card";
import { ROUTES } from "@/shared/config/routes";

const SECTIONS = [
  { id: "profil", label: "Profil" },
  { id: "szolgaltatasok", label: "Szolgáltatások" },
  { id: "munkaido", label: "Munkaidő" },
  { id: "szabalyok", label: "Foglalási szabályok" },
  { id: "vendegek", label: "Vendégeim" },
];

// /beallitasok – a barber beállításai: profil (kép, adatok, listában megjelenés), szolgáltatások,
// munkaidő, foglalási szabályok, vendégek (megbízható jelölés).
export default async function SettingsPage() {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  const barberId = user.barber!.id;
  const [profile, services, week, rules, customers] = await Promise.all([
    getMyBarberApplication(user.id),
    listMyServicesForEdit(barberId),
    getMyWorkingWeek(barberId),
    getMyBookingRules(barberId),
    listMyCustomers(barberId),
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

      {profile && (
        <div id="profil" className="scroll-mt-24">
          <Card>
            <h2 className="text-2xl font-bold">Profil</h2>
            <AvatarUpload url={profile.avatarUrl} name={profile.displayName} />
            <BarberApplicationForm
              initial={profile}
              submitLabel="Profil mentése"
              action={saveBarberProfileAction}
              slugHint="Ezt a linket osztod meg a vendégeiddel. Ha megváltoztatod, a régi link megszűnik."
            />
            <ListingToggle listed={profile.isListed} />
          </Card>
        </div>
      )}
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
      <div id="vendegek" className="scroll-mt-24">
        <Card>
          <h2 className="text-2xl font-bold">Vendégeim</h2>
          <p className="text-muted">
            A <strong className="text-foreground">megbízható</strong> vendég kérését nem kell jóváhagynod: azonnal
            megerősítésre kerül. Jelöld így a törzsvendégeidet.
          </p>
          <CustomerList customers={customers} />
        </Card>
      </div>
    </PageContainer>
  );
}
