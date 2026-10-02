"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedBarber } from "@/backend/auth/auth.service";
import { ROUTES } from "@/shared/config/routes";
import { type FormState, field } from "@/shared/types/form";
import { type BookingRules, type DayHours, validateBookingRules, validateWorkingHours } from "@/shared/validation/schedule";
import { saveBookingRules, saveWorkingWeek } from "./schedule.service";

async function currentBarberId(): Promise<string> {
  const user = await requireApprovedBarber(ROUTES.barberSettings);
  return user.barber!.id;
}

function refresh() {
  revalidatePath(ROUTES.barberSettings);
  revalidatePath(ROUTES.barberCalendar);
}

/** Heti munkaidő mentése. Az űrlap a hetet JSON-ként küldi („week” mező). */
export async function saveWorkingHoursAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await currentBarberId();
  let week: DayHours[];
  try {
    week = JSON.parse(field(formData, "week"));
    if (!Array.isArray(week)) throw new Error();
  } catch {
    return { error: "Érvénytelen munkaidő." };
  }

  const checked = validateWorkingHours(week);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors };

  const result = await saveWorkingWeek(checked.data);
  if (!result.ok) return { error: result.error };

  refresh();
  return {
    success: checked.data.length
      ? "Munkaidő elmentve – a vendégek ezekre az időkre foglalhatnak."
      : "Munkaidő elmentve. Figyelem: minden nap zárva, így most senki nem tud foglalni.",
  };
}

/** Foglalási szabályok mentése */
export async function saveBookingRulesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const barberId = await currentBarberId();
  const keys: (keyof BookingRules)[] = [
    "minNoticeMin",
    "maxDaysAhead",
    "approvalTimeoutMin",
    "cancelLimitHours",
    "bufferMin",
    "slotStepMin",
  ];
  const values = Object.fromEntries(keys.map((k) => [k, field(formData, k)])) as Record<keyof BookingRules, string>;

  const checked = validateBookingRules(values);
  if (!checked.ok) return { fieldErrors: checked.fieldErrors, values };

  const result = await saveBookingRules(barberId, checked.data);
  if (!result.ok) return { error: result.error, values };

  refresh();
  return { success: "Foglalási szabályok elmentve." };
}
