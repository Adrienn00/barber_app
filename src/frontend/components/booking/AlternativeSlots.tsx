"use client";

import { useActionState, useState, useTransition } from "react";
import { loadAlternativesAction, requestBookingAction } from "@/backend/booking/booking.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { ROUTES } from "@/shared/config/routes";
import { formatDayHu } from "@/shared/datetime/datetime";
import type { Slot } from "@/shared/types/directory";
import type { FormState } from "@/shared/types/form";

type AlternativeSlotsProps = {
  bookingId: string;
  serviceId: string;
};

/**
 * Elutasított / lejárt / a barber által lemondott foglalásnál: 2–3 másik szabad időpont
 * ugyanannál a barbernél, és egy kattintással új kérés valamelyikre.
 */
export function AlternativeSlots({ bookingId, serviceId }: AlternativeSlotsProps) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, formAction, sending] = useActionState<FormState, FormData>(requestBookingAction, {});

  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  if (slots === null) {
    return (
      <Button
        variant="secondary"
        disabled={loading}
        onClick={() => startLoading(async () => setSlots(await loadAlternativesAction(bookingId)))}
      >
        {loading ? "Keresés…" : "Másik időpontot kérek"}
      </Button>
    );
  }

  if (slots.length === 0) {
    return <p className="text-sm text-muted">A következő két hétben nincs szabad időpont ennél a barbernél.</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="backTo" value={ROUTES.myBookings} />
      <p className="text-sm text-muted">Szabad időpontok ugyanennél a barbernél – egy kattintás, és elküldjük a kérést:</p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <button
            key={s.startsAt}
            type="submit"
            name="startsAt"
            value={s.startsAt}
            disabled={sending}
            className="min-h-11 rounded-lg border border-line bg-background px-4 font-semibold hover:border-brass disabled:opacity-60"
          >
            {formatDayHu(s.startsAt)} {s.time}
          </button>
        ))}
      </div>
    </form>
  );
}
