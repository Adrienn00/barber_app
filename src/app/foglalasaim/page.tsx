import type { Metadata } from "next";
import { requireUser } from "@/backend/auth/auth.service";
import { getMyBookings } from "@/backend/booking/booking.service";
import { MyBookingCard } from "@/frontend/components/booking/MyBookingCard";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { LiveRefresh } from "@/frontend/components/requests/LiveRefresh";
import { Alert } from "@/frontend/components/ui/Alert";
import { LinkButton } from "@/frontend/components/ui/Button";
import { Reveal } from "@/frontend/components/ui/Reveal";
import { ROUTES } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Foglalásaim" };

// /foglalasaim – a vendég foglalásai: közelgő (függő + megerősített), múltbeli, lezárt
export default async function MyBookingsPage() {
  const user = await requireUser(ROUTES.myBookings);
  const { upcoming, past, closed } = await getMyBookings();

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Vendég" title="Foglalásaim" />
      {/* A barber döntése azonnal megjelenik */}
      <LiveRefresh filter={`customer_id=eq.${user.id}`} />

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Közelgő</h2>
        {upcoming.length === 0 ? (
          <div className="space-y-3">
            <Alert tone="info">Nincs közelgő foglalásod.</Alert>
            <LinkButton href={ROUTES.barbers}>Időpontot foglalok</LinkButton>
          </div>
        ) : (
          upcoming.map((b, i) => (
            <Reveal key={b.id} index={i}>
              <MyBookingCard booking={b} />
            </Reveal>
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Korábbiak</h2>
          {past.map((b, i) => (
            <Reveal key={b.id} index={i}>
              <MyBookingCard booking={b} />
            </Reveal>
          ))}
        </section>
      )}

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Elutasított, lejárt, lemondott</h2>
          {closed.map((b, i) => (
            <Reveal key={b.id} index={i}>
              <MyBookingCard booking={b} />
            </Reveal>
          ))}
        </section>
      )}
    </PageContainer>
  );
}
