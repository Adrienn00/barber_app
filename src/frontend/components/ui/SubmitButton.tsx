"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "./Button";

type SubmitButtonProps = {
  children: string;
  /** Felirat küldés közben, pl. „Mentés…” */
  pendingText?: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  /** Több gombos űrlapnál: melyik gomb küldte (pl. name="status" value="approved") */
  name?: string;
  value?: string;
  /** Küldés után is maradjon „dolgozó” állapotban (pl. átirányítás közben) */
  forcePending?: boolean;
};

/** Űrlapküldő gomb: küldés közben letiltja magát és jelzi, hogy dolgozik. */
export function SubmitButton({
  children,
  pendingText,
  variant,
  fullWidth = true,
  name,
  value,
  forcePending = false,
}: SubmitButtonProps) {
  const { pending: submitting } = useFormStatus();
  const pending = submitting || forcePending;
  return (
    <Button type="submit" variant={variant} fullWidth={fullWidth} disabled={pending} name={name} value={value}>
      {pending ? (pendingText ?? "Folyamatban…") : children}
    </Button>
  );
}
