import Link from "next/link";
import type { SetupStatus } from "@/backend/schedule/schedule.service";
import { LinkButton } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import { ROUTES } from "@/shared/config/routes";

type SetupChecklistProps = {
  status: SetupStatus;
  /** A barber nyilvános oldalának címe, pl. /b/kovacs-peter */
  publicPath: string;
};

const STEPS = [
  {
    key: "hasServices" as const,
    title: "Szolgáltatások és árak",
    text: "Mit vállalsz, mennyi idő nálad, mennyibe kerül.",
    href: `${ROUTES.barberSetup}?lepes=2`,
  },
  {
    key: "hasWorkingHours" as const,
    title: "Munkaidő",
    text: "Mely napokon és mikor foglalhatnak nálad.",
    href: `${ROUTES.barberSetup}?lepes=3`,
  },
];

/**
 * „Kezdő lépések” az új barbernek: amíg nincs szolgáltatása és munkaideje, nem lehet nála foglalni
 * és a listában sem jelenik meg. Kész állapotban nem jelenik meg (a naptár fejléce mutatja a linket).
 */
export function SetupChecklist({ status, publicPath }: SetupChecklistProps) {
  if (status.isReady) return null;
  const remaining = STEPS.filter((s) => !status[s.key]).length;
  return (
    <Card>
      <h2 className="text-2xl font-bold">Kezdő lépések</h2>
      <p className="text-muted">
        {remaining === 1 ? "Már csak egy lépés" : "Még két lépés"}, és a vendégek foglalhatnak nálad – addig a listában
        sem jelensz meg.
      </p>
      <LinkButton href={ROUTES.barberSetup}>Beállító varázsló indítása</LinkButton>
      <ol className="space-y-3">
        {STEPS.map((step, i) => {
          const done = status[step.key];
          return (
            <li key={step.key} className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-background p-4">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-bold ${
                  done ? "border-ok bg-ok text-background" : "border-brass text-brass"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <div className="min-w-40 flex-1">
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted">{step.text}</p>
              </div>
              {done ? (
                <span className="text-sm font-semibold text-ok">Kész</span>
              ) : (
                <LinkButton href={step.href} className="min-h-11 px-4 text-sm">
                  Beállítom
                </LinkButton>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted">
        Utána ezt a linket oszthatod meg a vendégeiddel:{" "}
        <Link href={publicPath} className="text-brass underline">
          {publicPath}
        </Link>
      </p>
    </Card>
  );
}
