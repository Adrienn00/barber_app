"use client";

import { useActionState } from "react";
import { respondRescheduleAction } from "@/backend/requests/requests.actions";
import type { MyBooking } from "@/backend/booking/booking.service";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { formatDateTimeHu, toBucharestTime } from "@/shared/datetime/datetime";
import type { FormState } from "@/shared/types/form";

/** Vendég: a barber új időpontot javasol – elfogadja, vagy marad a régi (a barber dönt róla). */
export function ProposalResponse({ proposal }: { proposal: NonNullable<MyBooking["proposal"]> }) {
  const [state, formAction] = useActionState<FormState, FormData>(respondRescheduleAction, {});
  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={formAction} className="space-y-3 rounded-lg border-2 border-dotted border-brass bg-brass/10 p-4">
      <input type="hidden" name="rescheduleId" value={proposal.id} />
      <p className="font-semibold">A barber új időpontot javasol:</p>
      <p className="font-display text-xl font-semibold text-brass">
        {formatDateTimeHu(proposal.startsAt)} – {toBucharestTime(proposal.endsAt)}
      </p>
      {proposal.note && (
        <p className="text-sm">
          <span className="text-muted">Üzenet: </span>
          {proposal.note}
        </p>
      )}
      <p className="text-sm text-muted">Válaszolj {formatDateTimeHu(proposal.expiresAt)}-ig. Addig a régi időpontod is megmarad.</p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex gap-2">
        <SubmitButton name="answer" value="accept" pendingText="Küldés…">
          Elfogadom
        </SubmitButton>
        <SubmitButton name="answer" value="decline" variant="secondary" pendingText="Küldés…">
          Nem jó nekem
        </SubmitButton>
      </div>
    </form>
  );
}
