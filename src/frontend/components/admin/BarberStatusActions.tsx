"use client";

import { useActionState, useState } from "react";
import { changeBarberStatusAction } from "@/backend/admin/admin.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import type { BarberStatus } from "@/shared/types/domain";
import type { FormState } from "@/shared/types/form";

/**
 * Az adott státuszhoz illő admin gombok:
 * - függő: Jóváhagyás / Elutasítás (kötelező indoklással)
 * - jóváhagyott: Felfüggesztés (opcionális indoklással)
 * - felfüggesztett: Visszaállítás
 */
export function BarberStatusActions({ barberId, status }: { barberId: string; status: BarberStatus }) {
  const [state, action] = useActionState<FormState, FormData>(changeBarberStatusAction, {});
  // Melyik indoklásos művelet van kinyitva (elutasítás / felfüggesztés)
  const [reasonFor, setReasonFor] = useState<"rejected" | "suspended" | null>(null);

  if (status === "rejected") return null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="barberId" value={barberId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}

      {reasonFor ? (
        <>
          <input type="hidden" name="status" value={reasonFor} />
          <TextArea
            label={reasonFor === "rejected" ? "Elutasítás oka (a barber látja)" : "Felfüggesztés oka (nem kötelező)"}
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
