"use client";

import { useActionState } from "react";
import { signUpAction } from "@/backend/auth/auth.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import { useFullPageRedirect } from "@/frontend/lib/useFullPageRedirect";
import type { FormState } from "@/shared/types/form";
import { MIN_PASSWORD_LENGTH } from "@/shared/validation/forms";
import { TermsCheckbox } from "./TermsCheckbox";

/** Regisztráció: név, telefon (kötelező), e-mail, jelszó, feltételek. */
export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signUpAction, {});
  const redirecting = useFullPageRedirect(state);

  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField
        label="Teljes név"
        name="fullName"
        autoComplete="name"
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
      />
      <TextField
        label="Telefonszám"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="0745 123 456"
        hint="A barber ezen tud elérni, ha változik valami."
        defaultValue={state.values?.phone}
        error={state.fieldErrors?.phone}
      />
      <TextField
        label="E-mail-cím"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Jelszó"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`Legalább ${MIN_PASSWORD_LENGTH} karakter.`}
        error={state.fieldErrors?.password}
      />
      <TermsCheckbox error={state.fieldErrors?.terms} />
      <SubmitButton pendingText="Regisztráció…" forcePending={redirecting}>Regisztráció</SubmitButton>
    </form>
  );
}
