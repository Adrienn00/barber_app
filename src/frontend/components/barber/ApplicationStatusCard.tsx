import type { BarberStatus } from "@/shared/types/domain";
import { LinkButton } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import { ROUTES } from "@/shared/config/routes";
import { BarberStatusBadge } from "./BarberStatusBadge";

type ApplicationStatusCardProps = {
  status: BarberStatus;
  rejectReason: string | null;
};

const TEXTS: Record<BarberStatus, string> = {
  pending: "Jelentkezésed megkaptuk, az admin hamarosan elbírálja. Addig az adataidat még javíthatod.",
  approved: "Jelentkezésed jóváhagytuk! Innen a naptáradban kezelheted az időpontjaidat.",
  rejected: "Jelentkezésed most nem hagytuk jóvá. Javítsd az adataidat, és küldd be újra.",
  suspended: "A barberfiókod jelenleg fel van függesztve, így nem fogadhatsz foglalást.",
};

/** A barberjelentkezés állapota és a következő lépés. */
export function ApplicationStatusCard({ status, rejectReason }: ApplicationStatusCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Jelentkezésed állapota</h2>
        <BarberStatusBadge status={status} />
      </div>
      <p className="text-muted">{TEXTS[status]}</p>
      {rejectReason && (status === "rejected" || status === "suspended") && (
        <p className="rounded-lg bg-background px-3 py-2 text-sm">
          <span className="text-muted">Indoklás: </span>
          {rejectReason}
        </p>
      )}
      {status === "approved" && (
        <LinkButton href={ROUTES.barberCalendar} fullWidth>
          Tovább a naptáramhoz
        </LinkButton>
      )}
    </Card>
  );
}
