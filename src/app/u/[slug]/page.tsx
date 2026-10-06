import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicShop } from "@/backend/directory/directory.service";
import { ProfileHero } from "@/frontend/components/directory/ProfileHero";
import { TeamMemberCard } from "@/frontend/components/directory/TeamMemberCard";
import { Alert } from "@/frontend/components/ui/Alert";
import { Eyebrow } from "@/frontend/components/ui/Eyebrow";
import { APP_NAME } from "@/shared/config/app";

export async function generateMetadata({ params }: PageProps<"/u/[slug]">): Promise<Metadata> {
  const shop = await getPublicShop((await params).slug);
  if (!shop) return { title: "Nem található" };
  const description = shop.bio ?? `${shop.name}, ${shop.city} – foglalj időpontot a csapathoz.`;
  return { title: shop.name, description, openGraph: { title: shop.name, description, siteName: APP_NAME } };
}

// /u/[slug] – egység nyilvános oldala: bemutatkozás és a csapat („Kik várnak a székben”)
export default async function ShopPage({ params }: PageProps<"/u/[slug]">) {
  const shop = await getPublicShop((await params).slug);
  if (!shop) notFound();

  return (
    <main className="flex-1">
      <ProfileHero
        eyebrow="Barbershop"
        name={shop.name}
        avatarUrl={shop.avatarUrl}
        bio={shop.bio}
        address={`${shop.city}, ${shop.address}`}
        phone={shop.phone}
        instagram={shop.instagram}
      />
      <section className="mx-auto max-w-5xl space-y-6 px-5 py-10">
        <div className="space-y-2">
          <Eyebrow>A csapat</Eyebrow>
          <h2 className="text-4xl font-bold sm:text-5xl">Kik várnak a székben</h2>
          <p className="text-muted">Válaszd ki, kinél szeretnél időpontot – mindenkinek saját árlistája van.</p>
        </div>
        {shop.members.length === 0 ? (
          <Alert tone="info">Az egység jelenleg nem fogad online foglalást.</Alert>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shop.members.map((m) => (
              <TeamMemberCard key={m.id} barber={m} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
