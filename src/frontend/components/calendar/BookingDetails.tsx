import { Badge } from "@/frontend/components/ui/Badge";
import { Icon } from "@/frontend/components/ui/Icon";
import { formatDateTimeHu, toBucharestTime } from "@/shared/datetime/datetime";
import type { CalendarBooking } from "@/shared/types/calendar";
import { formatPhone } from "@/shared/validation/phone";

/** Egy foglalás részletei: vendég, telefon (hívható), szolgáltatás, időpont, megjegyzés. */
export function BookingDetails({ booking }: { booking: CalendarBooking }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {booking.status === "pending" ? <Badge tone="warning">Függőben</Badge> : <Badge tone="success">Megerősítve</Badge>}
        {booking.isGuest && <Badge>Kézi foglalás</Badge>}
      </div>

      <dl className="space-y-3">
        <Row icon="calendar" label="Időpont">
          {formatDateTimeHu(booking.startsAt)} – {toBucharestTime(booking.endsAt)}
        </Row>
        <Row icon="user" label="Vendég">
          {booking.customerName}
        </Row>
        {booking.customerPhone && (
          <Row icon="phone" label="Telefon">
            <a href={`tel:${booking.customerPhone.replace(/\s/g, "")}`} className="text-brass underline">
              {formatPhone(booking.customerPhone)}
            </a>
          </Row>
        )}
        <Row icon="scissors" label="Szolgáltatás">
          {booking.serviceName} · {booking.price} lej
        </Row>
      </dl>

      {booking.note && (
        <p className="rounded-lg bg-background px-4 py-3 text-sm">
          <span className="text-muted">Megjegyzés: </span>
          {booking.note}
        </p>
      )}

      <p className="text-sm text-muted">A jóváhagyás, elutasítás és lemondás a következő fázisban kerül ide.</p>
    </div>
  );
}

function Row({ icon, label, children }: { icon: "calendar" | "user" | "phone" | "scissors"; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-brass">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="font-semibold">{children}</dd>
      </div>
    </div>
  );
}
