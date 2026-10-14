"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";
import type { CutLog } from "@/shared/types/cutlog";
import { type FormState, field } from "@/shared/types/form";
import { getCutLog, saveCutNote } from "./cutlog.service";

async function currentBarberId(): Promise<string> {
  const user = await requireApprovedBarber(ROUTES.barberCalendar);
  return user.barber!.id;
}

/** Egy foglalás vágásnaplója (a naptárban, a foglalás ablakában) */
export async function loadCutLogAction(bookingId: string): Promise<CutLog | null> {
  return getCutLog(await currentBarberId(), bookingId);
}

/** Fotó + jegyzet mentése egy lezajlott foglaláshoz */
export async function saveCutNoteAction(bookingId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const barberId = await currentBarberId();
  const photo = formData.get("photo");
  const result = await saveCutNote(barberId, bookingId, {
    note: field(formData, "note"),
    photo: photo instanceof File && photo.size > 0 ? photo : null,
    removePhoto: field(formData, "removePhoto") === "true",
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(ROUTES.myBookings);
  return { success: "Elmentve a vágásnaplóba." };
}
