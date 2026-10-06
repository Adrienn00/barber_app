"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/backend/profile/profile.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import { DELETE_CONFIRM_WORD } from "@/shared/config/app";
import type { FormState } from "@/shared/types/form";

type DeleteAccountProps = {
  isBarber: boolean;
  isAdmin: boolean;
};

/** Fiók végleges törlése: előbb elmagyarázza, mi történik, és be kell írni a megerősítő szót. */
export function DeleteAccount({ isBarber, isAdmin }: DeleteAccountProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(deleteAccountAction, {});

  return (
    <section className="space-y-3 rounded-xl border border-danger/40 p-5">
      <h2 className="text-xl font-bold">Fiók törlése</h2>
      {isAdmin ? (
        <p className="text-muted">Admin fiókot itt nem lehet törölni.</p>
      ) : !open ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Fiókom törlése…
        </Button>
      ) : (
        <form action={formAction} className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>A neved, telefonszámod és e-mail-címed végleg törlődik.</li>
            <li>A jövőbeli foglalásaid lemondódnak, a barber értesítést kap.</li>
            {isBarber && (
              <li>
                A barberprofilod, szolgáltatásaid, naptárad és képeid törlődnek; a nálad foglaló vendégek jövőbeli
                foglalásai lemondódnak, és értesítést kapnak.
              </li>
            )}
            <li>A korábbi foglalásaid név nélkül maradnak meg a barber nyilvántartásában.</li>
            <li>Ez nem vonható vissza.</li>
          </ul>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <TextField
            label={`A megerősítéshez írd be: ${DELETE_CONFIRM_WORD}`}
            name="confirm"
            autoComplete="off"
            error={state.fieldErrors?.confirm}
          />
          <div className="flex gap-2">
            <SubmitButton variant="danger" pendingText="Törlés…" forcePending={pending}>
              Fiók végleges törlése
            </SubmitButton>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Mégse
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
