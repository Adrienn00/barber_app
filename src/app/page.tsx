import { FeatureRow } from "@/frontend/components/home/FeatureRow";
import { HomeHero } from "@/frontend/components/home/HomeHero";
import { Alert } from "@/frontend/components/ui/Alert";

// Kezdőlap: nyitó rész (vendégeknek és barbereknek) + ikonos információs sor.
// Fióktörlés után (?fiok=torolve) visszajelzés a tetején.
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const deleted = (await searchParams).fiok === "torolve";
  return (
    <main className="flex-1">
      {deleted && (
        <div className="mx-auto max-w-5xl px-5 pt-6">
          <Alert tone="success">A fiókodat töröltük. Köszönjük, hogy használtad az appot.</Alert>
        </div>
      )}
      <HomeHero />
      <FeatureRow />
    </main>
  );
}
