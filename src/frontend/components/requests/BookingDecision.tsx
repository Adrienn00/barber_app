"use client";

import { useActionState, useState } from "react";
import { decideBookingAction } from "@/backend/requests/requests.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import type { FormState } from "@/shared/types/form";

type BookingDecisionProps = {
  bookingId: string;
  status: "pending" | "confirmed";
  /** A döntés eredménye (pl. a naptár frissítéséhez); ha nincs, az üzenet itt jelenik meg */
  onDone?: (state: FormState) => void;
};

/**
 * A barber gombjai egy foglaláshoz:
 * függő → Jóváhagyás / Elutasítás (nem kötelező üzenettel); megerősített → Lemondás (kötelező indoklással).
 */
export function BookingDecision({ bookingId, status, onDone }: BookingDecisionProps) {
  const [state, formAction] = useActionState<FormState, FormData>(decideBookingAction, {});
  const [reasonFor, setReasonFor] = useState<"reject" | "cancel" | null>(null);
  useOnActionResult(state, (result) => onDone?.(result), true);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !onDone && <Alert tone="success">{state.success}</Alert>}

      {reasonFor ? (
        <>
          <input type="hidden" name="decision" value={reasonFor} />
          <TextArea
            label={reasonFor === "reject" ? "Üzenet a vendégnek (nem kötelező)" : "A lemondás oka (a vendég látja)"}
            name="note"
            rows={3}
            maxLength={500}
            defaultValue={state.values?.note}
            error={state.fieldErrors?.note}
            hint={reasonFor === "reject" ? "Pl. „Aznap nem érek rá, válassz a felajánlott időpontokból.”" : undefined}
          />
          <div className="flex gap-2">
            <SubmitButton variant="danger" pendingText="Mentés…">
              {reasonFor === "reject" ? "Elutasítás" : "Foglalás lemondása"}
            </SubmitButton>
            <Button variant="ghost" onClick={() => setReasonFor(null)}>
              Mégse
            </Button>
          </div>
        </>
      ) : status === "pending" ? (
        <div className="flex gap-2">
          <SubmitButton name="decision" value="approve" pendingText="Mentés…">
            Jóváhagyás
          </SubmitButton>
          <Button variant="secondary" fullWidth onClick={() => setReasonFor("reject")}>
            Elutasítás
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setReasonFor("cancel")}>
          Foglalás lemondása
        </Button>
      )}
    </form>
  );
}
