"use client";

import { withdrawRescheduleAction } from "@/backend/requests/requests.actions";
import { ConfirmActionButton } from "@/frontend/components/ui/ConfirmActionButton";
import type { FormState } from "@/shared/types/form";

type WithdrawProposalButtonProps = {
  rescheduleId: string;
  /** Függő kérésre adott javaslat: visszavonás után a kérés újra a barberre vár */
  forRequest?: boolean;
  onDone?: (state: FormState) => void;
};

/** A barber visszavonja a még függő javaslatát (áthelyezésnél a régi időpont marad, kérésnél újra ő dönt). */
export function WithdrawProposalButton({ rescheduleId, forRequest = false, onDone }: WithdrawProposalButtonProps) {
  return (
    <ConfirmActionButton
      action={withdrawRescheduleAction}
      fields={{ rescheduleId }}
      label="Javaslat visszavonása"
      confirmLabel="Igen, visszavonom"
      question={forRequest ? "A kérés újra a „Függő kérések” közé kerül, és dönthetsz róla." : "A régi időpont marad."}
      onDone={onDone}
    />
  );
}
