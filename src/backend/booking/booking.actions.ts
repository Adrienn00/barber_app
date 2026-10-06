"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/backend/auth/auth.service";
import { ROUTES, loginPath, safeNextPath } from "@/shared/config/routes";
import type { Slot } from "@/shared/types/directory";
import { type FormState, field } from "@/shared/types/form";
import { getSlots, requestBooking } from "./booking.service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Szabad időpontok egy napra (bejelentkezés nélkül is – csak kezdési időket ad, okot nem) */
export async function loadSlotsAction(barberId: string, serviceId: string, date: string): Promise<Slot[]> {
  if (!DATE_RE.test(date)) return [];
  return getSlots(barberId, serviceId, date);
}

/** Foglalási kérés elküldése. Bejelentkezés / hiányos profil esetén oda irányít, majd vissza. */
export async function requestBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const backTo = safeNextPath(field(formData, "backTo")) ?? ROUTES.barbers;
  const user = await getCurrentUser();
  if (!user) return { redirectTo: loginPath(backTo) };
  if (!user.isProfileComplete) return { redirectTo: `${ROUTES.profile}?next=${encodeURIComponent(backTo)}` };

  const serviceId = field(formData, "serviceId");
  const startsAt = field(formData, "startsAt");
  const note = field(formData, "note");
  if (!serviceId || Number.isNaN(new Date(startsAt).getTime())) return { error: "Válassz szolgáltatást és időpontot." };
  if (note.length > 500) return { fieldErrors: { note: "A megjegyzés legfeljebb 500 karakter lehet." }, values: { note } };

  const result = await requestBooking(serviceId, new Date(startsAt).toISOString(), note || null);
  if (!result.ok) return { error: result.error, values: { note } };

  revalidatePath(ROUTES.myBookings);
  return { success: "Kérésed elküldtük, a barber hamarosan visszaigazolja." };
}
