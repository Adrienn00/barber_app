"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/backend/auth/auth.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import type { FormState } from "@/shared/types/form";

/** Elfelejtett jelszó: e-mail-cím → visszaállító link a levélben. */
export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordResetAction, {});
  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <TextField
        label="E-mail-cím"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <SubmitButton pendingText="Küldés…">Visszaállító link küldése</SubmitButton>
    </form>
  );
}
