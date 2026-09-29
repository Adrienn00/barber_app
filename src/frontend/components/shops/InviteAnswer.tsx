"use client";

import { useActionState } from "react";
import { acceptInviteAction, declineInviteAction } from "@/backend/shops/shops.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import type { FormState } from "@/shared/types/form";

/** Meghívó elfogadása (→ a naptárba visz) vagy elutasítása. */
export function InviteAnswer({ token }: { token: string }) {
  const [acceptState, accept] = useActionState<FormState, FormData>(acceptInviteAction, {});
  const [declineState, decline] = useActionState<FormState, FormData>(declineInviteAction, {});

  if (declineState.success) return <Alert tone="info">{declineState.success}</Alert>;

  return (
    <div className="space-y-3">
      {(acceptState.error || declineState.error) && <Alert tone="error">{acceptState.error ?? declineState.error}</Alert>}
      <form action={accept}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton pendingText="Csatlakozás…">Elfogadom, csatlakozom</SubmitButton>
      </form>
      <form action={decline}>
        <input type="hidden" name="token" value={token} />
        <SubmitButton variant="ghost" pendingText="…">
          Nem, köszönöm
        </SubmitButton>
      </form>
    </div>
  );
}
