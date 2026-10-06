import "server-only";
import type { DbClient } from "@/backend/core/server-client";

// =============================================================================
// Vendég foglalás – Supabase-hívások. A vendég soha nem olvassa közvetlenül a foglalásokat:
// a szabad időpontokat és a foglalást is adatbázis-függvény adja / végzi.
// =============================================================================

export function selectAvailableSlots(db: DbClient, barberId: string, serviceId: string, date: string) {
  return db.rpc("get_available_slots", { p_barber_id: barberId, p_service_id: serviceId, p_date: date });
}

export function requestBooking(db: DbClient, serviceId: string, startsAt: string, note: string | null) {
  return db.rpc("request_booking", { p_service_id: serviceId, p_starts_at: startsAt, p_note: note ?? undefined });
}

export function selectMyBookings(db: DbClient) {
  return db.rpc("get_my_bookings");
}
