"use client";

import { useState } from "react";
import { BookingDecision } from "@/frontend/components/requests/BookingDecision";
import { WithdrawProposalButton } from "@/frontend/components/requests/WithdrawProposalButton";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { Icon } from "@/frontend/components/ui/Icon";
import { formatDateTimeHu, toBucharestTime } from "@/shared/datetime/datetime";
import type { CalendarBooking } from "@/shared/types/calendar";
import type { FormState } from "@/shared/types/form";
import { formatPhone } from "@/shared/validation/phone";

type BookingDetailsProps = {
  booking: CalendarBooking;
  /** Döntés (jóváhagyás / elutasítás / lemondás / javaslat visszavonása) után */
  onDone: (state: FormState) => void;
  /** Az áthelyezés ablakának megnyitása */
  onReschedule: () => void;
};

/** Egy foglalás részletei: vendég, telefon (hívható), szolgáltatás, időpont, megjegyzés – és a döntés gombjai. */
export function BookingDetails({ booking, onDone, onReschedule }: BookingDetailsProps) {
  // A megnyitás pillanatához mérve (a múltbeli foglaláson már nincs mit dönteni)
  const [openedAt] = useState(() => Date.now());
  const isFuture = new Date(booking.endsAt).getTime() > openedAt;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {booking.status === "pending" ? <Badge tone="warning">Függőben</Badge> : <Badge tone="success">Megerősítve</Badge>}
        {booking.isGuest && <Badge>Kézi foglalás</Badge>}
        {booking.movedFrom && <Badge>Áthelyezve (korábban: {formatDateTimeHu(booking.movedFrom)})</Badge>}
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

      {booking.proposal && (
        <div className="space-y-3 rounded-lg border border-dotted border-brass px-4 py-3">
          <p className="text-sm">
            Javasolt új időpont: <span className="font-semibold text-brass">{formatDateTimeHu(booking.proposal.startsAt)}</span>
            <br />
            <span className="text-muted">A vendég válaszára vár ({formatDateTimeHu(booking.proposal.expiresAt)}-ig).</span>
          </p>
          <WithdrawProposalButton rescheduleId={booking.proposal.id} onDone={onDone} />
        </div>
      )}

      {isFuture && booking.status === "confirmed" && (
        <Button variant="secondary" fullWidth onClick={onReschedule}>
          Áthelyezés másik időpontra
        </Button>
      )}
      {isFuture && (booking.status === "pending" || booking.status === "confirmed") && (
        <BookingDecision bookingId={booking.id} status={booking.status} onDone={onDone} />
      )}
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
