"use client";

import { useActionState, useState } from "react";
import { inviteBarberAction } from "@/backend/shops/shops.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import type { FormState } from "@/shared/types/form";

/**
 * Barber meghívása e-mail-cím alapján. Siker után a meghívó linket mutatja „Másolás” gombbal –
 * amíg nincs e-mail küldés (8. fázis), a vezető maga küldi el (pl. WhatsAppon).
 */
export function InviteForm() {
  const [state, action] = useActionState<FormState, FormData>(inviteBarberAction, {});
  const [copied, setCopied] = useState(false);
  const link = state.success ? state.values?.link : undefined;

  return (
    <Card title="Barber meghívása">
      <p className="text-sm text-muted">
        Add meg a barber e-mail-címét. Csak az fogadhatja el a meghívót, akinek a fiókja erre a címre szól.
      </p>
      <form action={action} className="space-y-3" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <TextField
          label="E-mail-cím"
          name="email"
          type="email"
          inputMode="email"
          placeholder="barber@pelda.hu"
          defaultValue={state.success ? "" : state.values?.email}
          error={state.fieldErrors?.email}
        />
        <SubmitButton pendingText="Küldés…">Meghívó létrehozása</SubmitButton>
      </form>

      {link && (
        <div className="space-y-2">
          <Alert tone="success">{state.success}</Alert>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 break-all rounded-lg border border-line bg-background px-3 py-2 text-sm">{link}</code>
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              {copied ? "Kimásolva ✓" : "Link másolása"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
