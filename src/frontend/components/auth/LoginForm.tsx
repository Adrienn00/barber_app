"use client";

import { useActionState } from "react";
import { signInAction } from "@/backend/auth/auth.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import { useFullPageRedirect } from "@/frontend/lib/useFullPageRedirect";
import type { FormState } from "@/shared/types/form";

/** Belépés e-maillel és jelszóval. */
export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signInAction, {});
  const redirecting = useFullPageRedirect(state);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
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
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingText="Belépés…" forcePending={redirecting}>Belépés</SubmitButton>
    </form>
  );
}
