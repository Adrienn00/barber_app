import { FeatureRow } from "@/frontend/components/home/FeatureRow";
import { HomeHero } from "@/frontend/components/home/HomeHero";

// Kezdőlap: nyitó rész (vendégeknek és barbereknek) + ikonos információs sor
export default function HomePage() {
  return (
    <main className="flex-1">
      <HomeHero />
      <FeatureRow />
    </main>
  );
}
