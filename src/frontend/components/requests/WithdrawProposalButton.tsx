"use client";

import { withdrawRescheduleAction } from "@/backend/requests/requests.actions";
import { ConfirmActionButton } from "@/frontend/components/ui/ConfirmActionButton";
import type { FormState } from "@/shared/types/form";

/** A barber visszavonja a még függő áthelyezési javaslatát (a régi időpont marad). */
export function WithdrawProposalButton({ rescheduleId, onDone }: { rescheduleId: string; onDone?: (state: FormState) => void }) {
  return (
    <ConfirmActionButton
      action={withdrawRescheduleAction}
      fields={{ rescheduleId }}
      label="Javaslat visszavonása"
      confirmLabel="Igen, visszavonom"
      question="A régi időpont marad."
      onDone={onDone}
    />
  );
}
