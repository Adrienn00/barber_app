import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { Database } from "@/shared/types/database.types";

// =============================================================================
// Naptár – Supabase-hívások (foglalások, magánprogramok, munkaidő, kézi foglalás)
// A jogosultságot az RLS és az adatbázis-függvények biztosítják: a barber csak a sajátját éri el.
// =============================================================================

type PrivateEventInsert = Database["public"]["Tables"]["private_events"]["Insert"];
type PrivateEventUpdate = Database["public"]["Tables"]["private_events"]["Update"];

/** Aktív (függő + megerősített) foglalások egy időszakban, szolgáltatással és vendéggel */
export function selectBookingsInRange(db: DbClient, barberId: string, from: string, to: string) {
  return db
    .from("bookings")
    .select(
      `id, status, starts_at, ends_at, guest_name, guest_phone, customer_note,
       service:services(name, price),
       customer:profiles!bookings_customer_id_fkey(full_name, phone)`,
    )
    .eq("barber_id", barberId)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", to)
    .gt("ends_at", from)
    .order("starts_at");
}

/** Magánprogram-alkalmak (heti ismétlődés kibontva, kihagyások nélkül) – az adatbázis számolja */
export function selectPrivateOccurrences(db: DbClient, from: string, to: string) {
  return db.rpc("get_my_private_event_occurrences", { p_from: from, p_to: to });
}

export function selectWorkingHours(db: DbClient, barberId: string) {
  return db
    .from("working_hours")
    .select("weekday, start_time, end_time")
    .eq("barber_id", barberId)
    .order("weekday")
    .order("start_time");
}

export function selectPrivateEvent(db: DbClient, eventId: string) {
  return db
    .from("private_events")
    .select("id, title, note, starts_at, ends_at, all_day, repeat, repeat_until")
    .eq("id", eventId)
    .maybeSingle();
}

export function insertPrivateEvent(db: DbClient, row: PrivateEventInsert) {
  return db.from("private_events").insert(row).select("id").single();
}

export function updatePrivateEvent(db: DbClient, eventId: string, fields: PrivateEventUpdate) {
  return db.from("private_events").update(fields).eq("id", eventId).select("id").maybeSingle();
}

export function deletePrivateEvent(db: DbClient, eventId: string) {
  return db.from("private_events").delete().eq("id", eventId).select("id").maybeSingle();
}

/** Egy heti alkalom kihagyása (a sorozat többi alkalma megmarad) */
export function insertOccurrenceSkip(db: DbClient, eventId: string, occurrenceDate: string) {
  return db.from("private_event_skips").insert({ event_id: eventId, occurrence_date: occurrenceDate });
}

/** Mely jövőbeli foglalásokkal ütközik egy magánprogram */
export function selectPrivateEventConflicts(db: DbClient, eventId: string) {
  return db.rpc("get_private_event_conflicts", { p_event_id: eventId });
}

export function createManualBooking(
  db: DbClient,
  args: {
    serviceId: string;
    startsAt: string;
    customerId: string | null;
    guestName: string | null;
    guestPhone: string | null;
    note: string | null;
  },
) {
  return db.rpc("create_manual_booking", {
    p_service_id: args.serviceId,
    p_starts_at: args.startsAt,
    p_customer_id: args.customerId ?? undefined,
    p_guest_name: args.guestName ?? undefined,
    p_guest_phone: args.guestPhone ?? undefined,
    p_note: args.note ?? undefined,
  });
}

export function selectActiveServices(db: DbClient, barberId: string) {
  return db
    .from("services")
    .select("id, name, duration_min, price")
    .eq("barber_id", barberId)
    .eq("is_active", true)
    .order("sort_order");
}

/** A barber korábbi vendégei (név, telefon) a kézi foglaláshoz */
export function selectMyCustomers(db: DbClient, barberId: string) {
  return db
    .from("barber_customers")
    .select("customer_id, customer:profiles!barber_customers_customer_id_fkey(full_name, phone)")
    .eq("barber_id", barberId);
}
