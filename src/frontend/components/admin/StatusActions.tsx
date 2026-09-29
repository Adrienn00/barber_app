"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import type { BarberStatus } from "@/shared/types/domain";
import type { FormState } from "@/shared/types/form";

type StatusActionsProps = {
  /** A művelet (changeBarberStatusAction vagy changeShopStatusAction) */
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Az azonosító mező neve, pl. barberId / shopId */
  idField: "barberId" | "shopId";
  targetId: string;
  status: BarberStatus;
  /** Kinek szól az indoklás, pl. „a barber” / „az egység vezetője” */
  subject: string;
};

/**
 * Admin gombok a státuszhoz igazítva (barbernél és egységnél is):
 * függő → Jóváhagyás / Elutasítás (kötelező indoklással); jóváhagyott → Felfüggesztés; felfüggesztett → Visszaállítás.
 */
export function StatusActions({ action, idField, targetId, status, subject }: StatusActionsProps) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  // Melyik indoklásos művelet van kinyitva
  const [reasonFor, setReasonFor] = useState<"rejected" | "suspended" | null>(null);

  if (status === "rejected") return null;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name={idField} value={targetId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {reasonFor ? (
        <>
          <input type="hidden" name="status" value={reasonFor} />
          <TextArea
            label={reasonFor === "rejected" ? `Elutasítás oka (${subject} látja)` : "Felfüggesztés oka (nem kötelező)"}
            name="reason"
            rows={3}
            error={state.fieldErrors?.reason}
          />
          <div className="flex gap-2">
            <SubmitButton variant="danger" pendingText="Mentés…">
              {reasonFor === "rejected" ? "Elutasítás" : "Felfüggesztés"}
            </SubmitButton>
            <Button variant="ghost" onClick={() => setReasonFor(null)}>
              Mégse
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          {status === "pending" && (
            <>
              <SubmitButton name="status" value="approved" pendingText="Mentés…">
                Jóváhagyás
              </SubmitButton>
              <Button variant="secondary" fullWidth onClick={() => setReasonFor("rejected")}>
                Elutasítás
              </Button>
            </>
          )}
          {status === "approved" && (
            <Button variant="secondary" fullWidth onClick={() => setReasonFor("suspended")}>
              Felfüggesztés
            </Button>
          )}
          {status === "suspended" && (
            <SubmitButton name="status" value="approved" variant="secondary" pendingText="Mentés…">
              Visszaállítás
            </SubmitButton>
          )}
        </div>
      )}
    </form>
  );
}
