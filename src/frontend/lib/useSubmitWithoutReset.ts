"use client";

import { type FormEvent, startTransition } from "react";

/**
 * Űrlap-beküldés automatikus „alaphelyzetbe állítás” nélkül.
 *
 * A React 19 egy <form action={…}> beküldése után alaphelyzetbe állítja az űrlap mezőit – ez az
 * „élő” (állapotból vezérelt) mezőket is megzavarja: pl. egy bejelölt „Egész napos” jelölő
 * kikapcsoltnak látszik, pedig nem az. Ahol ilyen mező van, a <form onSubmit={…}> ezt használja.
 *
 * A „küldés folyamatban” állapotot a useActionState harmadik értéke adja (isPending).
 */
export function useSubmitWithoutReset(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A lenyomott gomb name/value párja is kerüljön bele (pl. több gombos űrlapnál)
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}
