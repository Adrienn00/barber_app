import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import { type BookingRules, type DayHours, WEEK_DAYS, type WorkingHoursSlot } from "@/shared/validation/schedule";
import * as q from "./schedule.queries";

// =============================================================================
// Munkaidő és foglalási szabályok – ezekből számoljuk a vendégnek a szabad időpontokat
// =============================================================================

type Result = { ok: true } | { ok: false; error: string };

/** A heti munkaidő napokra bontva (hétfőtől vasárnapig) – a szerkesztő ezt mutatja */
export async function getMyWorkingWeek(barberId: string): Promise<DayHours[]> {
  const { data } = await q.selectWorkingHours(await createClient(), barberId);
  const rows = data ?? [];
  return WEEK_DAYS.map(({ weekday }) => {
    const ranges = rows
      .filter((r) => r.weekday === weekday)
      .map((r) => ({ start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) }));
    return { weekday, open: ranges.length > 0, ranges };
  });
}

export async function saveWorkingWeek(slots: WorkingHoursSlot[]): Promise<Result> {
  const { error } = await q.replaceWorkingHours(await createClient(), slots);
  if (!error) return { ok: true };
  // A függvény saját üzenetei magyarok
  return { ok: false, error: error.code === "22023" || error.code === "42501" ? error.message : dbErrorMessage(error) };
}

export async function getMyBookingRules(barberId: string): Promise<BookingRules | null> {
  const { data } = await q.selectSettings(await createClient(), barberId);
  if (!data) return null;
  return {
    minNoticeMin: data.min_notice_min,
    maxDaysAhead: data.max_days_ahead,
    approvalTimeoutMin: data.approval_timeout_min,
    cancelLimitHours: data.cancel_limit_hours,
    bufferMin: data.buffer_min,
    slotStepMin: data.slot_step_min,
  };
}

export async function saveBookingRules(barberId: string, rules: BookingRules): Promise<Result> {
  const { data, error } = await q.updateSettings(await createClient(), barberId, {
    min_notice_min: rules.minNoticeMin,
    max_days_ahead: rules.maxDaysAhead,
    approval_timeout_min: rules.approvalTimeoutMin,
    cancel_limit_hours: rules.cancelLimitHours,
    buffer_min: rules.bufferMin,
    slot_step_min: rules.slotStepMin,
  });
  return error || !data ? { ok: false, error: dbErrorMessage(error, "Nem sikerült menteni.") } : { ok: true };
}
