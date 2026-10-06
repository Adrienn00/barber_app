"use client";

import { cancelBookingAction } from "@/backend/requests/requests.actions";
import { ConfirmActionButton } from "@/frontend/components/ui/ConfirmActionButton";

/** Vendég: saját foglalás (vagy kérés) lemondása, kétlépéses megerősítéssel. */
export function CancelMyBooking({ bookingId, isPending }: { bookingId: string; isPending: boolean }) {
  return (
    <ConfirmActionButton
      action={cancelBookingAction}
      fields={{ bookingId }}
      label={isPending ? "Kérés visszavonása" : "Lemondás"}
      confirmLabel={isPending ? "Igen, visszavonom" : "Igen, lemondom"}
      question="Biztos?"
    />
  );
}
