import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicBarber } from "@/backend/directory/directory.service";
import { OpeningHours } from "@/frontend/components/directory/OpeningHours";
import { ProfileHero } from "@/frontend/components/directory/ProfileHero";
import { ServicePriceList } from "@/frontend/components/directory/ServicePriceList";
import { Alert } from "@/frontend/components/ui/Alert";
import { LinkButton } from "@/frontend/components/ui/Button";
import { Icon } from "@/frontend/components/ui/Icon";
import { APP_NAME } from "@/shared/config/app";
import { bookingPath, shopPath } from "@/shared/config/routes";

// Megosztáskor szép előnézet (Open Graph): név, város, bemutatkozás
export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const barber = await getPublicBarber((await params).slug);
  if (!barber) return { title: "Nem található" };
  const description = barber.bio ?? `Foglalj időpontot: ${barber.name}, ${barber.city}.`;
  return {
    title: barber.name,
    description,
    openGraph: { title: `${barber.name} – ${barber.city}`, description, siteName: APP_NAME, type: "profile" },
  };
}

// /b/[slug] – a barber nyilvános oldala: bemutatkozás, árlista, nyitvatartás, foglalás
export default async function BarberPage({ params }: PageProps<"/b/[slug]">) {
  const barber = await getPublicBarber((await params).slug);
  if (!barber) notFound();

  return (
    <main className="flex-1">
      <ProfileHero
        eyebrow={barber.shop ? barber.shop.name : "Barber"}
        name={barber.name}
        bio={barber.bio}
        address={`${barber.city}, ${barber.address}`}
        phone={barber.phone}
        instagram={barber.instagram}
        actions={
          barber.bookable ? (
            <LinkButton href={bookingPath(barber.slug)}>
              <Icon name="calendar" /> Időpontot foglalok
            </LinkButton>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-5xl space-y-10 px-5 py-10">
        {barber.shop && (
          <p className="text-muted">
            A(z){" "}
            <Link href={shopPath(barber.shop.slug)} className="font-semibold text-brass underline">
              {barber.shop.name}
            </Link>{" "}
            csapatának tagja.
          </p>
        )}
        {!barber.bookable && <Alert tone="info">{barber.name} jelenleg nem fogad online foglalást.</Alert>}

        {barber.services.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-4xl font-bold">Szolgáltatások</h2>
            <ServicePriceList
              services={barber.services}
              bookingHref={barber.bookable ? (id) => bookingPath(barber.slug, id) : undefined}
            />
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-4xl font-bold">Nyitvatartás</h2>
          <OpeningHours days={barber.openingHours} />
        </section>
      </div>
    </main>
  );
}
