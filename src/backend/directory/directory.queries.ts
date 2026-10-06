import "server-only";
import type { DbClient } from "@/backend/core/server-client";

// =============================================================================
// Nyilvános adatok (barberlista, barberoldal, egységoldal) – Supabase-hívások.
// Az RLS csak a jóváhagyott barbereket / egységeket és az aktív szolgáltatásokat engedi látni.
// =============================================================================

export function listDirectory(db: DbClient, search: string | null) {
  return db.rpc("list_directory", { p_search: search ?? undefined });
}

export function selectBarberBySlug(db: DbClient, slug: string) {
  return db
    .from("barbers")
    .select("id, slug, display_name, bio, city, address, phone, instagram, avatar_path, shop_id, status")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
}

export function selectActiveServices(db: DbClient, barberId: string) {
  return db
    .from("services")
    .select("id, name, duration_min, price")
    .eq("barber_id", barberId)
    .eq("is_active", true)
    .order("sort_order");
}

export function selectWorkingHours(db: DbClient, barberId: string) {
  return db.from("working_hours").select("weekday, start_time, end_time").eq("barber_id", barberId).order("start_time");
}

export function selectShopBySlug(db: DbClient, slug: string) {
  return db
    .from("shops")
    .select("id, slug, name, bio, city, address, phone, instagram, avatar_path")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
}

export function selectShopById(db: DbClient, shopId: string) {
  return db.from("shops").select("id, slug, name").eq("id", shopId).eq("status", "approved").maybeSingle();
}

export function selectShopMembers(db: DbClient, shopId: string) {
  return db.rpc("get_shop_members", { p_shop_id: shopId });
}
