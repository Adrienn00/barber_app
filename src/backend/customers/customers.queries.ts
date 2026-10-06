import "server-only";
import type { DbClient } from "@/backend/core/server-client";

// =============================================================================
// A barber vendégei – Supabase-hívások. A barber csak a saját vendégeit látja (RLS),
// és csak a „megbízható” jelölést módosíthatja.
// =============================================================================

export function selectMyCustomers(db: DbClient, barberId: string) {
  return db
    .from("barber_customers")
    .select("customer_id, is_trusted, created_at, customer:profiles!barber_customers_customer_id_fkey(full_name, phone)")
    .eq("barber_id", barberId);
}

/** A megerősített foglalások (látogatások) a vendégenkénti statisztikához */
export function selectConfirmedBookings(db: DbClient, barberId: string) {
  return db
    .from("bookings")
    .select("customer_id, starts_at")
    .eq("barber_id", barberId)
    .eq("status", "confirmed")
    .not("customer_id", "is", null);
}

export function updateTrusted(db: DbClient, barberId: string, customerId: string, trusted: boolean) {
  return db
    .from("barber_customers")
    .update({ is_trusted: trusted })
    .eq("barber_id", barberId)
    .eq("customer_id", customerId)
    .select("customer_id");
}
