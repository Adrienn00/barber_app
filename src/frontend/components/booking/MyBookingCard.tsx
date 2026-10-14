import Link from "next/link";
import type { MyBooking } from "@/backend/booking/booking.service";
import { CutEntryView } from "@/frontend/components/cutlog/CutEntryView";
import { Badge, type BadgeTone } from "@/frontend/components/ui/Badge";
import { LinkButton } from "@/frontend/components/ui/Button";
import { Icon } from "@/frontend/components/ui/Icon";
import { AlternativeSlots } from "./AlternativeSlots";
import { CancelMyBooking } from "./CancelMyBooking";
import { ProposalResponse } from "./ProposalResponse";
import { barberPath, bookingPath } from "@/shared/config/routes";
import { formatDateTimeHu, toBucharestTime } from "@/shared/datetime/datetime";
import type { BookingStatus } from "@/shared/types/domain";

const STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Jóváhagyásra vár", tone: "warning" },
  confirmed: { label: "Megerősítve", tone: "success" },
  rejected: { label: "Elutasítva", tone: "danger" },
  expired: { label: "Lejárt", tone: "neutral" },
  cancelled: { label: "Lemondva", tone: "neutral" },
};

/**
 * Egy foglalás a „Foglalásaim” oldalon: barber, szolgáltatás, időpont, állapot, cím –
 * lemondás gombbal, meghiúsult foglalásnál másik időpontok ajánlásával; lezajlottnál a vágásnaplóval és
 * egy koppintásos újrafoglalással.
 */
export function MyBookingCard({ booking }: { booking: MyBooking }) {
  const status = STATUS[booking.status];
  return (
    <article className="space-y-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-semibold">
            {formatDateTimeHu(booking.startsAt)} – {toBucharestTime(booking.endsAt)}
          </p>
          <p className="text-muted">
            {booking.serviceName} · {booking.price} lej ·{" "}
            <Link href={barberPath(booking.barberSlug)} className="text-brass hover:underline">
              {booking.barberName}
            </Link>
          </p>
        </div>
        <Badge tone={status.tone}>
          {status.label}
          {booking.status === "cancelled" && booking.cancelledBy === "barber" ? " (a barber)" : ""}
        </Badge>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Icon name="mapPin" size={16} /> {booking.address}
      </p>
      {booking.movedFrom && booking.status === "confirmed" && (
        <p className="text-sm text-brass">Áthelyezve (korábban: {formatDateTimeHu(booking.movedFrom)}).</p>
      )}
      {booking.proposal && <ProposalResponse proposal={booking.proposal} />}
      {booking.awaitingBarberDecision && booking.status === "confirmed" && (
        <p className="rounded-lg bg-background px-3 py-2 text-sm">
          A javasolt új időpont nem jött létre – a régi időpontod él. Ha a barbernek mégsem jó, itt látni fogod.
        </p>
      )}
      {booking.decisionNote && (
        <p className="rounded-lg bg-background px-3 py-2 text-sm">
          <span className="text-muted">A barber üzenete: </span>
          {booking.decisionNote}
        </p>
      )}
      {booking.status === "pending" && booking.expiresAt && (
        <p className="text-sm text-muted">Ha {formatDateTimeHu(booking.expiresAt)}-ig nem dönt a barber, a kérés lejár.</p>
      )}
      {booking.canCancel && <CancelMyBooking bookingId={booking.id} isPending={booking.status === "pending"} />}
      {booking.cancelDeadlinePassed && (
        <p className="text-sm text-muted">
          A lemondási határidő ({booking.cancelLimitHours} órával előtte) lejárt – ha mégsem tudsz jönni, hívd fel a barbert.
        </p>
      )}
      {booking.offerAlternatives && (
        <AlternativeSlots bookingId={booking.id} serviceId={booking.serviceId} />
      )}
      {booking.cut && (
        <div className="space-y-2 rounded-lg bg-background px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-brass">
            <Icon name="scissors" size={16} /> Vágásnapló – {booking.barberName} jegyzete
          </p>
          <CutEntryView entry={booking.cut} showDate={false} />
        </div>
      )}
      {booking.canRebook && (
        <LinkButton href={bookingPath(booking.barberSlug, booking.serviceId)} variant="secondary">
          <Icon name="repeat" size={18} /> {booking.cut ? "Ugyanezt kérem újra" : "Újra foglalok"}
        </LinkButton>
      )}
    </article>
  );
}
