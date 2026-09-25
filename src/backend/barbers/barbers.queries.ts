import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { Database } from "@/shared/types/database.types";

// =============================================================================
// Barberek – Supabase-hívások
// =============================================================================

type BarberInsert = Database["public"]["Tables"]["barbers"]["Insert"];
type BarberUpdate = Database["public"]["Tables"]["barbers"]["Update"];

export function selectApplicationOfUser(db: DbClient, userId: string) {
  return db
    .from("barbers")
    .select("display_name, slug, city, address, phone, bio, instagram, status, reject_reason")
    .eq("user_id", userId)
    .maybeSingle();
}

export function insertBarber(db: DbClient, row: BarberInsert) {
  return db.from("barbers").insert(row);
}

export function updateBarber(db: DbClient, barberId: string, fields: BarberUpdate) {
  return db.from("barbers").update(fields).eq("id", barberId);
}

/** Elutasított jelentkezés újraküldése (adatbázis-függvény) */
export function reapplyAsBarber(db: DbClient) {
  return db.rpc("reapply_as_barber");
}
