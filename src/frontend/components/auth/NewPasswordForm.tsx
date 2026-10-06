"use client";

import { useActionState } from "react";
import { setNewPasswordAction } from "@/backend/auth/auth.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import { useFullPageRedirect } from "@/frontend/lib/useFullPageRedirect";
import { MIN_PASSWORD_LENGTH } from "@/shared/validation/forms";
import type { FormState } from "@/shared/types/form";

/** Új jelszó megadása (kétszer), utána tovább a kezdőoldalra. */
export function NewPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(setNewPasswordAction, {});
  const redirecting = useFullPageRedirect(state);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <TextField
        label="Új jelszó"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`Legalább ${MIN_PASSWORD_LENGTH} karakter.`}
        error={state.fieldErrors?.password}
      />
      <TextField
        label="Új jelszó még egyszer"
        name="passwordAgain"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.passwordAgain}
      />
      <SubmitButton pendingText="Mentés…" forcePending={redirecting}>
        Új jelszó mentése
      </SubmitButton>
    </form>
  );
}
