"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBarber, requireUser } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { approveRequest, cancelBooking, rejectRequest } from "./requests.service";

function refresh() {
  revalidatePath(ROUTES.barberRequests);
  revalidatePath(ROUTES.barberCalendar);
  revalidatePath(ROUTES.myBookings);
  revalidatePath("/", "layout"); // a menü számjelzője
}

function note(formData: FormData): string | null {
  return field(formData, "note") || null;
}

const DECISIONS = {
  approve: { run: (id: string) => approveRequest(id), success: "Jóváhagyva – a foglalás megerősítve." },
  reject: {
    run: (id: string, note: string | null) => rejectRequest(id, note),
    success: "Elutasítva – a vendég másik időpontokat kap ajánlatként.",
  },
  cancel: { run: (id: string, note: string | null) => cancelBooking(id, note), success: "A foglalás lemondva." },
} as const;

/** Barber döntése egy foglalásról: jóváhagyás, elutasítás (nem kötelező indoklással) vagy lemondás (kötelező indoklással) */
export async function decideBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedBarber(ROUTES.barberRequests);
  const decision = field(formData, "decision") as keyof typeof DECISIONS;
  if (!(decision in DECISIONS)) return { error: "Ismeretlen művelet." };
  const text = note(formData);
  if (decision === "cancel" && !text) {
    return { fieldErrors: { note: "Írd meg röviden az okát – a vendég ezt látja." } };
  }
  if (text && text.length > 500) return { fieldErrors: { note: "Legfeljebb 500 karakter." }, values: { note: text } };

  const result = await DECISIONS[decision].run(field(formData, "bookingId"), text);
  if (!result.ok) return { error: result.error };
  refresh();
  return { success: DECISIONS[decision].success };
}

/** Vendég: saját foglalás lemondása (függőt bármikor, megerősítettet a lemondási határidő előtt) */
export async function cancelBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser(ROUTES.myBookings);
  const result = await cancelBooking(field(formData, "bookingId"), note(formData));
  if (!result.ok) return { error: result.error };
  refresh();
  return { success: "A foglalás lemondva." };
}
