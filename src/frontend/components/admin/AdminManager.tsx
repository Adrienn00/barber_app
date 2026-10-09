"use client";

import { useActionState } from "react";
import { grantAdminAction, revokeAdminAction } from "@/backend/admin/admin.actions";
import type { AdminUser } from "@/backend/admin/admin.service";
import { Alert } from "@/frontend/components/ui/Alert";
import { ConfirmActionButton } from "@/frontend/components/ui/ConfirmActionButton";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import type { FormState } from "@/shared/types/form";

/**
 * Adminok kezelése: a jelenlegi adminok listája (elvétel – saját magadtól nem), és új admin
 * hozzáadása e-mail-cím alapján (a személynek előbb regisztrálnia kell az appban).
 */
export function AdminManager({ admins }: { admins: AdminUser[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(grantAdminAction, {});

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {admins.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-background px-4 py-3"
          >
            <div>
              <p className="font-semibold">
                {a.name ?? "Név nélkül"} {a.isMe && <span className="text-sm font-normal text-muted">(te)</span>}
              </p>
              <p className="text-sm text-muted">{a.email}</p>
            </div>
            {!a.isMe && (
              <ConfirmActionButton
                action={revokeAdminAction}
                fields={{ email: a.email }}
                label="Admin jog elvétele"
                confirmLabel="Igen, elveszem"
                question="Biztos?"
              />
            )}
          </li>
        ))}
      </ul>

      <form action={formAction} className="space-y-3" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}
        <TextField
          label="Új admin e-mail-címe"
          name="email"
          type="email"
          inputMode="email"
          placeholder="pl. kolléga@gmail.com"
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
          hint="Előbb regisztráljon az appban (e-maillel vagy Google-lel), utána tudod adminná tenni."
        />
        <SubmitButton pendingText="Mentés…">Admin jog megadása</SubmitButton>
      </form>
    </div>
  );
}
