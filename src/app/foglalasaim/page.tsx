import type { Metadata } from "next";
import { requireUser } from "@/backend/auth/auth.service";
import { getMyBookings } from "@/backend/booking/booking.service";
import { MyBookingCard } from "@/frontend/components/booking/MyBookingCard";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Alert } from "@/frontend/components/ui/Alert";
import { LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Foglalásaim" };

// /foglalasaim – a vendég foglalásai: közelgő (függő + megerősített), múltbeli, lezárt
export default async function MyBookingsPage() {
  await requireUser(ROUTES.myBookings);
  const { upcoming, past, closed } = await getMyBookings();

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Vendég" title="Foglalásaim" />

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Közelgő</h2>
        {upcoming.length === 0 ? (
          <div className="space-y-3">
            <Alert tone="info">Nincs közelgő foglalásod.</Alert>
            <LinkButton href={ROUTES.barbers}>Időpontot foglalok</LinkButton>
          </div>
        ) : (
          upcoming.map((b) => <MyBookingCard key={b.id} booking={b} />)
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Korábbiak</h2>
          {past.map((b) => (
            <MyBookingCard key={b.id} booking={b} />
          ))}
        </section>
      )}

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Elutasított, lejárt, lemondott</h2>
          {closed.map((b) => (
            <MyBookingCard key={b.id} booking={b} />
          ))}
        </section>
      )}
    </PageContainer>
  );
}
