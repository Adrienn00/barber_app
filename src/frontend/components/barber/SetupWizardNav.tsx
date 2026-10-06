import { LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";

export const SETUP_STEPS = ["Profil", "Szolgáltatások", "Munkaidő", "Szabályok", "Kész"];

export function setupStepPath(step: number): string {
  return `${ROUTES.barberSetup}?lepes=${step + 1}`;
}

type SetupWizardNavProps = {
  /** 0-tól számolva */
  step: number;
  /** A „Tovább” gomb tiltva (pl. még nincs szolgáltatás), a mellette lévő magyarázattal */
  blockedReason?: string;
};

/** A beállító varázsló alja: Vissza / Tovább (a mentést az adott lépés űrlapja végzi). */
export function SetupWizardNav({ step, blockedReason }: SetupWizardNavProps) {
  const last = step === SETUP_STEPS.length - 1;
  return (
    <div className="space-y-2 border-t border-line pt-4">
      {blockedReason && <p className="text-sm text-muted">{blockedReason}</p>}
      <div className="flex gap-2">
        {step > 0 && (
          <LinkButton href={setupStepPath(step - 1)} variant="ghost">
            Vissza
          </LinkButton>
        )}
        {!last &&
          (blockedReason ? (
            <span className="inline-flex min-h-12 flex-1 cursor-not-allowed items-center justify-center rounded-lg bg-line px-5 font-semibold text-muted">
              Tovább: {SETUP_STEPS[step + 1]}
            </span>
          ) : (
            <LinkButton href={setupStepPath(step + 1)} fullWidth>
              Tovább: {SETUP_STEPS[step + 1]}
            </LinkButton>
          ))}
      </div>
    </div>
  );
}
