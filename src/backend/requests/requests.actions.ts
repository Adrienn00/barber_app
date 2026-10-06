"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBarber, requireUser } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";
import { formatDateTimeHu } from "@/shared/datetime/datetime";
import { type FormState, field } from "@/shared/types/form";
import { validateReschedule } from "@/shared/validation/calendar";
import {
  approveRequest,
  cancelBooking,
  rejectRequest,
  rescheduleBooking,
  resolveReschedule,
  respondReschedule,
  withdrawReschedule,
} from "./requests.service";

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

// -----------------------------------------------------------------------------
// Áthelyezés
// -----------------------------------------------------------------------------

/** Barber: foglalás áthelyezése – javaslatként (a vendég dönt) vagy közvetlenül (már megbeszélték) */
export async function rescheduleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedBarber(ROUTES.barberCalendar);
  const values = {
    date: field(formData, "date"),
    time: field(formData, "time"),
    mode: field(formData, "mode"),
    note: field(formData, "note"),
  };
  const checked = validateReschedule(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const { startsAt, mode, note: text } = checked.data;
  const result = await rescheduleBooking(field(formData, "bookingId"), startsAt, mode, text);
  if (!result.ok) return { error: result.error, values };
  refresh();
  return {
    success:
      mode === "propose"
        ? `Javaslat elküldve (${formatDateTimeHu(startsAt)}). Amíg a vendég nem válaszol, ez az időpont foglalt, és a régi is megmarad.`
        : `Áthelyezve: ${formatDateTimeHu(startsAt)}.`,
  };
}

/** Barber: a még függő javaslat visszavonása (a régi időpont marad) */
export async function withdrawRescheduleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedBarber(ROUTES.barberRequests);
  const result = await withdrawReschedule(field(formData, "rescheduleId"));
  if (!result.ok) return { error: result.error };
  refresh();
  return { success: "Javaslat visszavonva – a régi időpont marad." };
}

/** Barber: elutasított / lejárt javaslat után marad a régi, vagy lemondja (indoklással) */
export async function resolveRescheduleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedBarber(ROUTES.barberRequests);
  const keep = field(formData, "decision") === "keep";
  const text = note(formData);
  if (!keep && !text) return { fieldErrors: { note: "Írd meg röviden az okát – a vendég ezt látja." } };

  const result = await resolveReschedule(field(formData, "rescheduleId"), keep, text);
  if (!result.ok) return { error: result.error };
  refresh();
  return { success: keep ? "Rendben, a régi időpont marad." : "A foglalás lemondva." };
}

/** Vendég: válasz a barber javaslatára (elfogadja vagy nem) */
export async function respondRescheduleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser(ROUTES.myBookings);
  const accept = field(formData, "answer") === "accept";
  const result = await respondReschedule(field(formData, "rescheduleId"), accept);
  if (!result.ok) return { error: result.error };
  refresh();
  return {
    success: accept
      ? "Elfogadva – a foglalásod átkerült az új időpontra."
      : "Rendben, jeleztük a barbernek. A régi időpontod egyelőre marad.",
  };
}
