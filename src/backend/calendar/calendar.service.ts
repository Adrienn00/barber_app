import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import { formatDateTimeHu, toBucharestDate, toBucharestLocal, toBucharestTime } from "@/shared/datetime/datetime";
import type {
  CalendarBooking,
  CalendarData,
  CalendarPrivateEvent,
  CustomerOption,
  ServiceOption,
} from "@/shared/types/calendar";
import type { ManualBookingData, PrivateEventData, PrivateEventInput } from "@/shared/validation/calendar";
import * as q from "./calendar.queries";

// =============================================================================
// Naptár – a barber foglalásai, magánprogramjai, munkaideje; magánprogramok kezelése; kézi foglalás
// =============================================================================

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** A naptár egy időszakra (pl. a látható hét): foglalások + magánprogram-alkalmak + munkaidő */
export async function getCalendar(barberId: string, from: string, to: string): Promise<CalendarData> {
  const db = await createClient();
  const [bookings, occurrences, hours] = await Promise.all([
    q.selectBookingsInRange(db, barberId, from, to),
    q.selectPrivateOccurrences(db, from, to),
    q.selectWorkingHours(db, barberId),
  ]);

  return {
    bookings: (bookings.data ?? []).map(
      (b): CalendarBooking => ({
        kind: "booking",
        id: b.id,
        status: b.status,
        startsAt: b.starts_at,
        endsAt: b.ends_at,
        startLocal: toBucharestLocal(b.starts_at),
        endLocal: toBucharestLocal(b.ends_at),
        serviceName: b.service?.name ?? "",
        price: Number(b.service?.price ?? 0),
        customerName: b.customer?.full_name ?? b.guest_name ?? "Törölt fiók",
        customerPhone: b.customer?.phone ?? b.guest_phone ?? null,
        isGuest: !b.customer && Boolean(b.guest_name),
        note: b.customer_note,
      }),
    ),
    privateEvents: (occurrences.data ?? []).map(
      (o): CalendarPrivateEvent => ({
        kind: "private",
        eventId: o.event_id,
        occurrenceDate: o.occurrence_date,
        startsAt: o.starts_at,
        endsAt: o.ends_at,
        startLocal: toBucharestLocal(o.starts_at),
        endLocal: toBucharestLocal(o.ends_at),
        title: o.title,
        note: o.note,
        allDay: o.all_day,
        repeat: o.repeat,
        repeatUntil: o.repeat_until,
      }),
    ),
    workingHours: (hours.data ?? []).map((h) => ({
      weekday: h.weekday,
      start: h.start_time.slice(0, 5),
      end: h.end_time.slice(0, 5),
    })),
  };
}

/** Egy magánprogram (sorozat) adatai szerkesztéshez, az űrlap formájában (helyi dátum/idő) */
export async function getPrivateEventForEdit(eventId: string): Promise<(PrivateEventInput & { id: string }) | null> {
  const { data } = await q.selectPrivateEvent(await createClient(), eventId);
  if (!data) return null;
  // Egész napos eseménynél az utolsó nap = a (kizárólagos) vég előtti nap
  const lastDay = toBucharestDate(new Date(new Date(data.ends_at).getTime() - 1));
  const firstDay = toBucharestDate(data.starts_at);
  return {
    id: data.id,
    title: data.title,
    date: firstDay,
    startTime: data.all_day ? "" : toBucharestTime(data.starts_at),
    endTime: data.all_day ? "" : toBucharestTime(data.ends_at),
    allDay: data.all_day,
    endDate: data.all_day && lastDay !== firstDay ? lastDay : "",
    repeatWeekly: data.repeat === "weekly",
    repeatUntil: data.repeat_until ?? "",
    note: data.note ?? "",
  };
}

/**
 * Magánprogram mentése (új vagy meglévő). Mentés után megnézi, ütközik-e foglalással:
 * ez nem akadály, csak figyelmeztetés (docs/dontesek.md 10.).
 */
export async function savePrivateEvent(
  barberId: string,
  eventId: string | null,
  data: PrivateEventData,
): Promise<Result<{ id: string; conflicts: string[] }>> {
  const db = await createClient();
  const row = {
    title: data.title,
    note: data.note,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    all_day: data.allDay,
    repeat: data.repeat,
    repeat_until: data.repeatUntil,
  };

  const saved = eventId
    ? await q.updatePrivateEvent(db, eventId, row)
    : await q.insertPrivateEvent(db, { ...row, barber_id: barberId });
  if (saved.error) return { ok: false, error: dbErrorMessage(saved.error) };
  if (!saved.data) return { ok: false, error: "A program nem található." };

  const { data: conflicts } = await q.selectPrivateEventConflicts(db, saved.data.id);
  return {
    ok: true,
    id: saved.data.id,
    conflicts: (conflicts ?? []).map((c) => formatDateTimeHu(c.starts_at)),
  };
}

/** Törlés: az egész sorozat, vagy (heti ismétlődésnél) csak egy alkalom */
export async function removePrivateEvent(
  eventId: string,
  scope: "series" | "occurrence",
  occurrenceDate?: string,
): Promise<Result> {
  const db = await createClient();
  if (scope === "occurrence") {
    if (!occurrenceDate) return { ok: false, error: "Hiányzik az alkalom dátuma." };
    const { error } = await q.insertOccurrenceSkip(db, eventId, occurrenceDate);
    // 23505: már ki van hagyva – ez nem hiba
    if (error && error.code !== "23505") return { ok: false, error: dbErrorMessage(error, "Nem sikerült kihagyni.") };
    return { ok: true };
  }
  const { data, error } = await q.deletePrivateEvent(db, eventId);
  if (error) return { ok: false, error: dbErrorMessage(error, "Nem sikerült törölni.") };
  if (!data) return { ok: false, error: "A program nem található." };
  return { ok: true };
}

export async function createManualBooking(data: ManualBookingData): Promise<Result<{ id: string }>> {
  const { data: id, error } = await q.createManualBooking(await createClient(), data);
  if (error || !id) {
    // A függvény saját üzenetei (ütközés, hiányzó adat) már magyarok
    const ownMessage = error && ["22023", "23P01", "42501"].includes(error.code ?? "") ? error.message : null;
    return { ok: false, error: ownMessage ?? dbErrorMessage(error, "Nem sikerült a foglalás.") };
  }
  return { ok: true, id };
}

/** Kézi foglaláshoz: a barber aktív szolgáltatásai */
export async function listMyServices(barberId: string): Promise<ServiceOption[]> {
  const { data } = await q.selectActiveServices(await createClient(), barberId);
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, durationMin: s.duration_min, price: Number(s.price) }));
}

/** Kézi foglaláshoz: a barber korábbi vendégei, név szerint rendezve */
export async function listMyCustomers(barberId: string): Promise<CustomerOption[]> {
  const { data } = await q.selectMyCustomers(await createClient(), barberId);
  return (data ?? [])
    .map((c) => ({ id: c.customer_id, name: c.customer?.full_name ?? "Névtelen", phone: c.customer?.phone ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "hu"));
}
