import "server-only";
import type { DbClient } from "@/backend/core/server-client";

// =============================================================================
// Függő kérések és döntések – Supabase-hívások.
// A státuszt csak az adatbázis-függvények (approve/reject/cancel_booking) változtatják.
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
