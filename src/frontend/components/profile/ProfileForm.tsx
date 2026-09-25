"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/backend/profile/profile.actions";
import { TermsCheckbox } from "@/frontend/components/auth/TermsCheckbox";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import type { FormState } from "@/shared/types/form";

type ProfileFormProps = {
  email: string;
  fullName: string;
  phone: string;
  /** Ha még nem fogadta el (pl. Google-belépés után), itt kell */
  needsTerms: boolean;
  next?: string;
};

/** Profil szerkesztése / első kiegészítése: név és kötelező telefonszám. */
export function ProfileForm({ email, fullName, phone, needsTerms, next }: ProfileFormProps) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField label="E-mail-cím" name="email" value={email} disabled readOnly hint="Az e-mail-cím nem módosítható." />
      <TextField
        label="Teljes név"
        name="fullName"
        autoComplete="name"
        defaultValue={state.values?.fullName ?? fullName}
        error={state.fieldErrors?.fullName}
      />
      <TextField
        label="Telefonszám"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        placeholder="0745 123 456"
        hint="Kötelező – a barber ezen tud elérni."
        defaultValue={state.values?.phone ?? phone}
        error={state.fieldErrors?.phone}
      />
      {needsTerms && <TermsCheckbox error={state.fieldErrors?.terms} />}
      <SubmitButton pendingText="Mentés…">Mentés</SubmitButton>
    </form>
  );
}
