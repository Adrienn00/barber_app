import { BarberStatusBadge } from "@/frontend/components/barber/BarberStatusBadge";
import { Card } from "@/frontend/components/ui/Card";
import type { BarberStatus } from "@/shared/types/domain";

const TEXTS: Record<BarberStatus, string> = {
  pending: "Az egységedet az admin hamarosan jóváhagyja. Addig az adatait még javíthatod. Jóváhagyás után hívhatod meg a barbereidet.",
  approved: "Az egységed aktív. Hívd meg a barbereidet – ők az elfogadás után az egység oldalán jelennek meg.",
  rejected: "Az egységedet most nem hagytuk jóvá. Javítsd az adatokat, és küldd be újra.",
  suspended: "Az egységed jelenleg fel van függesztve, nem jelenik meg a vendégeknek.",
};

/** Az egység állapota és a következő teendő. */
export function ShopStatusCard({ name, status, rejectReason }: { name: string; status: BarberStatus; rejectReason: string | null }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{name}</h2>
        <BarberStatusBadge status={status} />
      </div>
      <p className="text-muted">{TEXTS[status]}</p>
      {rejectReason && (status === "rejected" || status === "suspended") && (
        <p className="rounded-lg bg-background px-3 py-2 text-sm">
          <span className="text-muted">Indoklás: </span>
          {rejectReason}
        </p>
      )}
    </Card>
  );
}
