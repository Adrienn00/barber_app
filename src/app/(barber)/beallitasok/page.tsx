import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { removeAvatarAction, saveBarberProfileAction, uploadAvatarAction } from "@/backend/barbers/barbers.actions";
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
import { CollapsibleSection } from "@/frontend/components/ui/CollapsibleSection";
import { ROUTES } from "@/shared/config/routes";
import { summarizeRules, summarizeWeek } from "@/shared/validation/schedule";

const SECTIONS = [
  { id: "profil", label: "Profil" },
  { id: "szolgaltatasok", label: "Szolgáltatások" },
  { id: "munkaido", label: "Munkaidő" },
  { id: "szabalyok", label: "Foglalási szabályok" },
  { id: "vendegek", label: "Vendégeim" },
];

/** Pl. „3 aktív szolgáltatás · 40–70 lej” */
function servicesSummary(services: { price: number; isActive: boolean }[]): string {
  const active = services.filter((s) => s.isActive);
  if (!active.length) return "Még nincs aktív szolgáltatásod";
  const prices = active.map((s) => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return `${active.length} aktív szolgáltatás · ${min === max ? min : `${min}–${max}`} lej`;
}

// Minden rész összecsukható: összecsukva egy rövid összefoglaló látszik, mentés után magától visszacsukódik.
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
        <CollapsibleSection
          id="profil"
          title="Profil"
          summary={`${profile.displayName} · ${profile.city} · /b/${profile.slug}${profile.isListed ? "" : " · nem látszik a listában"}`}
        >
          <AvatarUpload
            url={profile.avatarUrl}
            name={profile.displayName}
            uploadAction={uploadAvatarAction}
            removeAction={removeAvatarAction}
          />
          <BarberApplicationForm
            initial={profile}
            submitLabel="Profil mentése"
            action={saveBarberProfileAction}
            slugHint="Ezt a linket osztod meg a vendégeiddel. Ha megváltoztatod, a régi link megszűnik."
          />
          <ListingToggle listed={profile.isListed} />
        </CollapsibleSection>
      )}
      <CollapsibleSection
        id="szolgaltatasok"
        title="Szolgáltatásaim"
        summary={servicesSummary(services)}
        defaultOpen={!services.some((s) => s.isActive)}
      >
        <PriceListEditor services={services} embedded />
      </CollapsibleSection>
      <CollapsibleSection
        id="munkaido"
        title="Munkaidő"
        summary={summarizeWeek(week)}
        defaultOpen={!week.some((d) => d.open)}
      >
        <WorkingHoursEditor initial={week} embedded />
      </CollapsibleSection>
      {rules && (
        <CollapsibleSection id="szabalyok" title="Foglalási szabályok" summary={summarizeRules(rules)}>
          <BookingRulesForm initial={rules} embedded />
        </CollapsibleSection>
      )}
      <CollapsibleSection
        id="vendegek"
        title="Vendégeim"
        summary={
          customers.length
            ? `${customers.length} vendég · ${customers.filter((c) => c.isTrusted).length} megbízható`
            : "Még nincs vendéged"
        }
      >
        <p className="text-muted">
          A <strong className="text-foreground">megbízható</strong> vendég kérését nem kell jóváhagynod: azonnal
          megerősítésre kerül. Jelöld így a törzsvendégeidet.
        </p>
        <CustomerList customers={customers} />
      </CollapsibleSection>
    </PageContainer>
  );
}
