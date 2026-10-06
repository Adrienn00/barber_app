import "server-only";
import type { DbClient } from "@/backend/core/server-client";

// =============================================================================
// Függő kérések, döntések és áthelyezés – Supabase-hívások.
// A státuszt és az időpontot csak az adatbázis-függvények változtatják.
// =============================================================================

/** A barber még érvényes függő kérései, időrendben (vendég és szolgáltatás adataival) */
export function selectPendingRequests(db: DbClient, barberId: string) {
  return db
    .from("bookings")
    .select(
      `id, starts_at, ends_at, expires_at, customer_note, guest_name, guest_phone, created_at,
       service:services(name, duration_min, price),
       customer:profiles!bookings_customer_id_fkey(full_name, phone)`,
    )
    .eq("barber_id", barberId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("starts_at");
}

/** A függő kérések száma (a menü számjelzőjéhez) */
export function countPendingRequests(db: DbClient, barberId: string) {
  return db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("barber_id", barberId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());
}

export function approveBooking(db: DbClient, bookingId: string) {
  return db.rpc("approve_booking", { p_booking_id: bookingId });
}

export function rejectBooking(db: DbClient, bookingId: string, note: string | null) {
  return db.rpc("reject_booking", { p_booking_id: bookingId, p_note: note ?? undefined });
}

export function cancelBooking(db: DbClient, bookingId: string, note: string | null) {
  return db.rpc("cancel_booking", { p_booking_id: bookingId, p_note: note ?? undefined });
}

// -----------------------------------------------------------------------------
// Áthelyezés
// -----------------------------------------------------------------------------

/** A barber nyitott áthelyezési ügyei: a vendég válaszára váró és a döntést igénylő (elutasított / lejárt) javaslatok */
export function selectOpenReschedules(db: DbClient, barberId: string) {
  return db
    .from("booking_reschedules")
    .select(
      `id, status, starts_at, ends_at, expires_at, note, needs_decision,
       booking:bookings(id, starts_at, ends_at, service:services(name)),
       customer:profiles(full_name, phone)`,
    )
    .eq("barber_id", barberId)
    .or(`and(status.eq.pending,expires_at.gt.${new Date().toISOString()}),needs_decision.is.true`)
    .order("starts_at");
}

/** A döntést igénylő javaslatok száma (a menü számjelzőjéhez) */
export function countRescheduleDecisions(db: DbClient, barberId: string) {
  return db
    .from("booking_reschedules")
    .select("id", { count: "exact", head: true })
    .eq("barber_id", barberId)
    .eq("needs_decision", true);
}

export function proposeReschedule(db: DbClient, bookingId: string, startsAt: string, note: string | null) {
  return db.rpc("propose_reschedule", { p_booking_id: bookingId, p_starts_at: startsAt, p_note: note ?? undefined });
}

export function moveBooking(db: DbClient, bookingId: string, startsAt: string, note: string | null) {
  return db.rpc("move_booking", { p_booking_id: bookingId, p_starts_at: startsAt, p_note: note ?? undefined });
}

export function withdrawReschedule(db: DbClient, rescheduleId: string) {
  return db.rpc("withdraw_reschedule", { p_reschedule_id: rescheduleId });
}

export function resolveReschedule(db: DbClient, rescheduleId: string, keep: boolean, note: string | null) {
  return db.rpc("resolve_reschedule", { p_reschedule_id: rescheduleId, p_keep: keep, p_note: note ?? undefined });
}

export function respondReschedule(db: DbClient, rescheduleId: string, accept: boolean) {
  return db.rpc("respond_reschedule", { p_reschedule_id: rescheduleId, p_accept: accept });
}
