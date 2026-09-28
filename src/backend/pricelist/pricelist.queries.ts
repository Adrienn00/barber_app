import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { Database } from "@/shared/types/database.types";

// =============================================================================
// Árlista (a barber saját szolgáltatásai) – Supabase-hívások
// Az RLS biztosítja, hogy a barber csak a saját szolgáltatásait érje el.
// =============================================================================

type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];
type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];

/** Az összes saját szolgáltatás (a rejtettek is), sorrend szerint */
export function selectMyServices(db: DbClient, barberId: string) {
  return db
    .from("services")
    .select("id, name, duration_min, price, is_active, sort_order")
    .eq("barber_id", barberId)
    .order("sort_order")
    .order("created_at");
}

export function insertService(db: DbClient, row: ServiceInsert) {
  return db.from("services").insert(row).select("id").single();
}

export function updateService(db: DbClient, serviceId: string, fields: ServiceUpdate) {
  return db.from("services").update(fields).eq("id", serviceId).select("id").maybeSingle();
}

export function deleteService(db: DbClient, serviceId: string) {
  return db.from("services").delete().eq("id", serviceId).select("id").maybeSingle();
}
