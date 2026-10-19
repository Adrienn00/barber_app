import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/backend/auth/auth.service";
import { getOpenSlots } from "@/backend/directory/directory.service";
import { getMyStartPage } from "@/backend/schedule/schedule.service";
import { FeatureRow } from "@/frontend/components/home/FeatureRow";
import { HomeHero } from "@/frontend/components/home/HomeHero";
import { OpenSlotsSection } from "@/frontend/components/home/OpenSlotsSection";
import { Alert } from "@/frontend/components/ui/Alert";
import { startPagePath } from "@/shared/config/startPage";

/**
 * Az app (vagy az oldal) megnyitása-e ez, nem az appon belüli kattintás a logóra / „Kezdőlap”-ra:
 * belülről érkezve a böngésző elküldi, honnan jöttünk (ugyanerről az oldalról).
 */
async function isFreshOpen(): Promise<boolean> {
  const list = await headers();
  const referer = list.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).host !== list.get("host");
  } catch {
    return true;
  }
}

// Kezdőlap: nyitó rész (vendégeknek és barbereknek), „Ma még szabad” időpontok, ikonos információs sor.
// Fióktörlés után (?fiok=torolve) visszajelzés a tetején.
// A barber az app megnyitásakor a beállított indulóoldalára kerül (naptár / új kézi foglalás).
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [query, openSlots] = await Promise.all([searchParams, getOpenSlots()]);
  const deleted = query.fiok === "torolve";

  const user = await getCurrentUser();
  if (user?.isApprovedBarber && !deleted && (await isFreshOpen())) {
    const target = startPagePath(await getMyStartPage(user.barber!.id));
    if (target) redirect(target);
  }
  return (
    <main className="flex-1">
      {deleted && (
        <div className="mx-auto max-w-5xl px-5 pt-6">
          <Alert tone="success">A fiókodat töröltük. Köszönjük, hogy használtad az appot.</Alert>
        </div>
      )}
      <HomeHero />
      <OpenSlotsSection data={openSlots} />
      <FeatureRow />
    </main>
  );
}
