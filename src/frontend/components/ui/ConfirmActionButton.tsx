"use client";

import { useActionState, useState } from "react";
import { Button, type ButtonVariant } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import type { FormState } from "@/shared/types/form";

type ConfirmActionButtonProps = {
  /** A szerveroldali művelet (pl. removeMemberAction) */
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Rejtett mezők a művelethez, pl. { barberId: "…" } */
  fields?: Record<string, string>;
  label: string;
  /** A megerősítő gomb felirata, pl. „Igen, eltávolítom” */
  confirmLabel: string;
  /** Rövid figyelmeztetés a megerősítés előtt */
  question?: string;
  variant?: ButtonVariant;
  /** A művelet eredménye (pl. üzenet megjelenítéséhez a szülőben) */
  onDone?: (state: FormState) => void;
};

/**
 * Kétlépéses gomb visszafordíthatatlan műveletekhez: első kattintásra rákérdez, másodikra végrehajtja.
 * (A böngésző confirm() ablaka helyett – mobilon is kényelmes.)
 */
export function ConfirmActionButton({
  action,
  fields = {},
  label,
  confirmLabel,
  question,
  variant = "secondary",
  onDone,
}: ConfirmActionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    setConfirming(false);
    onDone?.(result);
    return result;
  }, {});

  if (!confirming) {
    return (
      <div className="space-y-1">
        <Button variant={variant} onClick={() => setConfirming(true)} className="min-h-10 px-4 text-sm">
          {label}
        </Button>
        {state.error && !onDone && <p className="text-sm text-danger">{state.error}</p>}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {question && <span className="text-sm text-muted">{question}</span>}
      <div className="flex gap-2">
        <SubmitButton variant="danger" fullWidth={false} pendingText="…">
          {confirmLabel}
        </SubmitButton>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
