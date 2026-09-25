"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";
import type { CalendarData } from "@/shared/types/calendar";
import { type FormState, field } from "@/shared/types/form";
import { validateManualBooking, validatePrivateEvent } from "@/shared/validation/calendar";
import {
  createManualBooking,
  getCalendar,
  getPrivateEventForEdit,
  removePrivateEvent,
  savePrivateEvent,
} from "./calendar.service";

const MAX_RANGE_DAYS = 62;

async function currentBarberId(): Promise<string> {
  const user = await requireApprovedBarber(ROUTES.barberCalendar);
  return user.barber!.id;
}

/** A naptár adatai a látható időszakra (a naptár lapozáskor hívja) */
export async function loadCalendarAction(from: string, to: string): Promise<CalendarData> {
  const barberId = await currentBarberId();
  const start = new Date(from);
  const end = new Date(to);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (Number.isNaN(days) || days <= 0 || days > MAX_RANGE_DAYS) {
    return { bookings: [], privateEvents: [], workingHours: [] };
  }
  return getCalendar(barberId, start.toISOString(), end.toISOString());
}

/** Egy magánprogram adatai a szerkesztő űrlaphoz */
export async function loadPrivateEventAction(eventId: string) {
  await currentBarberId();
  return getPrivateEventForEdit(eventId);
}

/** Magánprogram mentése (új, vagy eventId esetén módosítás) */
export async function savePrivateEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const barberId = await currentBarberId();
  const values = {
    title: field(formData, "title"),
    date: field(formData, "date"),
    startTime: field(formData, "startTime"),
    endTime: field(formData, "endTime"),
    endDate: field(formData, "endDate"),
    repeatUntil: field(formData, "repeatUntil"),
    note: field(formData, "note"),
  };
  const allDay = formData.get("allDay") === "on";
  const repeatWeekly = formData.get("repeatWeekly") === "on";

  const checked = validatePrivateEvent({ ...values, allDay, repeatWeekly });
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await savePrivateEvent(barberId, field(formData, "eventId") || null, checked.data);
  if (!result.ok) return { error: result.error, values };

  revalidatePath(ROUTES.barberCalendar);
  const warning = result.conflicts.length
    ? `Figyelem: ez a program ${result.conflicts.length} foglalással ütközik (${result.conflicts.slice(0, 3).join("; ")}${
        result.conflicts.length > 3 ? "; …" : ""
      }). A foglalások megmaradtak – szükség esetén mondd le őket.`
    : undefined;
  return { success: "Program elmentve.", warning };
}

/** Magánprogram törlése: scope = "series" (az egész) vagy "occurrence" (csak ez az alkalom) */
export async function deletePrivateEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await currentBarberId();
  const eventId = field(formData, "eventId");
  const scope = field(formData, "scope") === "occurrence" ? "occurrence" : "series";
  if (!eventId) return { error: "Érvénytelen kérés." };

  const result = await removePrivateEvent(eventId, scope, field(formData, "occurrenceDate") || undefined);
  if (!result.ok) return { error: result.error };

  revalidatePath(ROUTES.barberCalendar);
  return { success: scope === "occurrence" ? "Ez az alkalom kihagyva." : "Program törölve." };
}

/** Kézi foglalás felvétele (azonnal megerősített) */
export async function createManualBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await currentBarberId();
  const values = {
    serviceId: field(formData, "serviceId"),
    date: field(formData, "date"),
    time: field(formData, "time"),
    customerId: field(formData, "customerId"),
    guestName: field(formData, "guestName"),
    guestPhone: field(formData, "guestPhone"),
    note: field(formData, "note"),
  };

  const checked = validateManualBooking(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await createManualBooking(checked.data);
  if (!result.ok) return { error: result.error, values };

  revalidatePath(ROUTES.barberCalendar);
  return { success: "Foglalás felvéve." };
}
