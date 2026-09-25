import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { BarberStatus } from "@/shared/types/domain";

// =============================================================================
// Platform admin – Supabase-hívások
// (Az adatbázis-függvények maguk ellenőrzik, hogy a hívó admin-e.)
// =============================================================================

export function selectAllBarbers(db: DbClient) {
  return db
    .from("barbers")
    .select("id, display_name, slug, city, address, phone, bio, instagram, status, reject_reason, created_at, approved_at")
    .order("created_at", { ascending: false });
}

export function fetchAdminStats(db: DbClient) {
  return db.rpc("admin_stats");
}

export function setBarberStatus(db: DbClient, barberId: string, status: BarberStatus, reason?: string) {
  return db.rpc("admin_set_barber_status", {
    p_barber_id: barberId,
    p_status: status,
    p_reason: reason || undefined,
  });
}

export function selectAllShops(db: DbClient) {
  return db
    .from("shops")
    .select("id, name, slug, city, address, phone, bio, instagram, status, reject_reason, created_at, approved_at, owner:barbers!shops_owner_barber_id_fkey(display_name)")
    .order("created_at", { ascending: false });
}

export function setShopStatus(db: DbClient, shopId: string, status: BarberStatus, reason?: string) {
  return db.rpc("admin_set_shop_status", {
    p_shop_id: shopId,
    p_status: status,
    p_reason: reason || undefined,
  });
}
