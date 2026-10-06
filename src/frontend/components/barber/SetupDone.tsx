import type { SetupStatus } from "@/backend/schedule/schedule.service";
import { Alert } from "@/frontend/components/ui/Alert";
import { LinkButton } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";
import { ListingToggle } from "./ListingToggle";
import { setupStepPath } from "./SetupWizardNav";
import { ShareLinkButton } from "./ShareLinkButton";

type SetupDoneProps = {
  status: SetupStatus;
  publicPath: string;
  isListed: boolean;
};

/** A varázsló utolsó lépése: kész-e minden, a foglalási link megosztása, megjelenés a listában. */
export function SetupDone({ status, publicPath, isListed }: SetupDoneProps) {
  if (!status.isReady) {
    return (
      <div className="space-y-3">
        <Alert tone="info">Még hiányzik valami, mielőtt foglalhatnának nálad:</Alert>
        <ul className="space-y-2">
          {!status.hasServices && (
            <li>
              <LinkButton href={setupStepPath(1)} variant="secondary">
                Vegyél fel legalább egy szolgáltatást
              </LinkButton>
            </li>
          )}
          {!status.hasWorkingHours && (
            <li>
              <LinkButton href={setupStepPath(2)} variant="secondary">
                Add meg a munkaidődet
              </LinkButton>
            </li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Alert tone="success">Kész vagy! Mostantól foglalhatnak nálad.</Alert>
      <div className="space-y-2">
        <p className="font-semibold">Oszd meg a foglalási linkedet (Instagram, WhatsApp, Facebook):</p>
        <ShareLinkButton path={publicPath} />
      </div>
      <ListingToggle listed={isListed} />
      <div className="flex flex-wrap gap-2">
        <LinkButton href={ROUTES.barberCalendar}>Irány a naptáram</LinkButton>
        <LinkButton href={publicPath} variant="secondary">
          Megnézem az oldalamat
        </LinkButton>
      </div>
      <p className="text-sm text-muted">
        Bármit később is módosíthatsz a Beállításokban. Tipp: kapcsold be az értesítéseket (harang ikon), hogy azonnal
        lásd az új kéréseket.
      </p>
    </div>
  );
}
