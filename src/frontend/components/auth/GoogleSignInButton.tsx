"use client";

import { useActionState } from "react";
import { signInWithGoogleAction } from "@/backend/auth/auth.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import type { FormState } from "@/shared/types/form";

type GoogleSignInButtonProps = {
  next?: string;
  /** Be van-e kapcsolva a Google-belépés a Supabase-ben */
  enabled: boolean;
};

/** „Folytatás Google-fiókkal” gomb. Ha még nincs beállítva, letiltva jelenik meg. */
export function GoogleSignInButton({ next, enabled }: GoogleSignInButtonProps) {
  const [state, action] = useActionState<FormState, FormData>(signInWithGoogleAction, {});

  if (!enabled) {
    return (
      <div className="space-y-2">
        <Button variant="secondary" fullWidth disabled>
          <GoogleLogo /> Folytatás Google-fiókkal
        </Button>
        <p className="text-center text-xs text-muted">A Google-belépés hamarosan elérhető.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <SubmitButton variant="secondary" pendingText="Átirányítás…">
        Folytatás Google-fiókkal
      </SubmitButton>
    </form>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.8 2.4 2.6 6.6 2.6 11.9S6.8 21.4 12 21.4c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
