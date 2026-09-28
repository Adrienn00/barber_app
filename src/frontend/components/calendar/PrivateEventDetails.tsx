"use client";

import { useActionState, useState } from "react";
import { deletePrivateEventAction } from "@/backend/calendar/calendar.actions";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { formatDateHu, formatDateTimeHu, toBucharestTime } from "@/shared/datetime/datetime";
import type { CalendarPrivateEvent } from "@/shared/types/calendar";
import type { FormState } from "@/shared/types/form";

type PrivateEventDetailsProps = {
  event: CalendarPrivateEvent;
  onEdit: () => void;
  onChanged: (state: FormState) => void;
};

/** Magánprogram részletei + szerkesztés, törlés (heti sorozatnál: csak ez az alkalom vagy az egész). */
export function PrivateEventDetails({ event, onEdit, onChanged }: PrivateEventDetailsProps) {
  const [state, action] = useActionState<FormState, FormData>(deletePrivateEventAction, {});
  useOnActionResult(state, onChanged, true);
  const [confirming, setConfirming] = useState(false);
  const weekly = event.repeat === "weekly";

  return (
    <div className="space-y-4">
      <p className="text-lg">
        {event.allDay ? formatDateHu(event.startsAt) + " – egész nap" : `${formatDateTimeHu(event.startsAt)} – ${toBucharestTime(event.endsAt)}`}
      </p>
      {weekly && (
        <p className="text-sm text-muted">
          Minden héten ismétlődik{event.repeatUntil ? `, ${formatDateHu(event.repeatUntil)}-ig` : ""}.
        </p>
      )}
      {event.note && <p className="rounded-lg bg-background px-4 py-3 text-sm">{event.note}</p>}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {!confirming ? (
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onEdit}>
            {weekly ? "Sorozat szerkesztése" : "Szerkesztés"}
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setConfirming(true)}>
            Törlés
          </Button>
        </div>
      ) : (
        <form action={action} className="space-y-2">
          <input type="hidden" name="eventId" value={event.eventId} />
          <input type="hidden" name="occurrenceDate" value={event.occurrenceDate} />
          {weekly && (
            <SubmitButton name="scope" value="occurrence" variant="secondary" pendingText="Törlés…">
              Csak ezt az alkalmat törlöm
            </SubmitButton>
          )}
          <SubmitButton name="scope" value="series" variant="danger" pendingText="Törlés…">
            {weekly ? "Az egész sorozatot törlöm" : "Igen, törlöm"}
          </SubmitButton>
          <Button variant="ghost" fullWidth onClick={() => setConfirming(false)}>
            Mégse
          </Button>
        </form>
      )}
    </div>
  );
}
