import { changeBarberStatusAction } from "@/backend/admin/admin.actions";
import type { AdminBarber } from "@/backend/admin/admin.service";
import { Card } from "@/frontend/components/ui/Card";
import { BarberDetails } from "./BarberDetails";
import { StatusActions } from "./StatusActions";

/** Egy barber kártyája az admin felületen: adatok + a státuszhoz illő gombok. */
export function BarberAdminCard({ barber }: { barber: AdminBarber }) {
  return (
    <Card>
      <BarberDetails barber={barber} />
      <StatusActions
        action={changeBarberStatusAction}
        idField="barberId"
        targetId={barber.id}
        status={barber.status}
        subject="a barber"
      />
    </Card>
  );
}
