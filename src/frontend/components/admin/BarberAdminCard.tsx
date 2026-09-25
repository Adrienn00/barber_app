import type { AdminBarber } from "@/backend/admin/admin.service";
import { Card } from "@/frontend/components/ui/Card";
import { BarberDetails } from "./BarberDetails";
import { BarberStatusActions } from "./BarberStatusActions";

/** Egy barber kártyája az admin felületen: adatok + a státuszhoz illő gombok. */
export function BarberAdminCard({ barber }: { barber: AdminBarber }) {
  return (
    <Card>
      <BarberDetails barber={barber} />
      <BarberStatusActions barberId={barber.id} status={barber.status} />
    </Card>
  );
}
