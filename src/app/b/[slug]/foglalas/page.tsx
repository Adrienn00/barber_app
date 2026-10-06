import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBarber } from "@/backend/directory/directory.service";
import { BookingWizard } from "@/frontend/components/booking/BookingWizard";
import { PageContainer } from "@/frontend/components/layout/PageContainer";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Alert } from "@/frontend/components/ui/Alert";
import { bookingPath } from "@/shared/config/routes";
import { upcomingDays } from "@/shared/datetime/days";

export const metadata: Metadata = { title: "Foglalás" };

/** Ennyi napot mutatunk előre (a barber saját „meddig előre” szabályát az adatbázis alkalmazza) */
const DAYS_AHEAD = 28;

// /b/[slug]/foglalas – foglalás lépésekben (szolgáltatás → időpont → megerősítés)
export default async function BookingPage({ params, searchParams }: PageProps<"/b/[slug]/foglalas">) {
  const { slug } = await params;
  const query = await searchParams;
  const serviceParam = query.szolgaltatas;
  const startsParam = query.idopont;
  const barber = await getPublicBarber(slug);
  if (!barber) notFound();

  const openWeekdays = barber.openingHours.filter((d) => d.ranges.length > 0).map((d) => d.weekday);

  return (
    <PageContainer width="wide">
      <PageHeader eyebrow="Foglalás" title={barber.name} subtitle={`${barber.city}, ${barber.address}`} />
      {barber.bookable ? (
        <BookingWizard
          barber={{ id: barber.id, name: barber.name, address: `${barber.city}, ${barber.address}` }}
          services={barber.services}
          days={upcomingDays(DAYS_AHEAD, openWeekdays)}
          initialServiceId={typeof serviceParam === "string" ? serviceParam : undefined}
          initialStartsAt={typeof startsParam === "string" ? startsParam : undefined}
          backTo={bookingPath(barber.slug)}
        />
      ) : (
        <Alert tone="info">{barber.name} jelenleg nem fogad online foglalást.</Alert>
      )}
    </PageContainer>
  );
}
