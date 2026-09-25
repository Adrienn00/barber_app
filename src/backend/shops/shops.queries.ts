import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { Database } from "@/shared/types/database.types";

// =============================================================================
// Egységek (üzletek) – Supabase-hívások
// A jogosultságot az RLS és az adatbázis-függvények biztosítják (vezető, tag, meghívott).
// =============================================================================

type ShopInsert = Database["public"]["Tables"]["shops"]["Insert"];
type ShopUpdate = Database["public"]["Tables"]["shops"]["Update"];

export function selectShop(db: DbClient, shopId: string) {
  return db
    .from("shops")
    .select("id, slug, name, city, address, phone, bio, instagram, status, reject_reason, is_listed")
    .eq("id", shopId)
    .maybeSingle();
}

export function insertShop(db: DbClient, row: ShopInsert) {
  return db.from("shops").insert(row).select("id").single();
}

export function updateShop(db: DbClient, shopId: string, fields: ShopUpdate) {
  return db.from("shops").update(fields).eq("id", shopId).select("id").maybeSingle();
}

export function reapplyShop(db: DbClient) {
  return db.rpc("reapply_shop");
}

export function selectMembers(db: DbClient, shopId: string) {
  return db.rpc("get_shop_members", { p_shop_id: shopId });
}

/** Az egység még meg nem válaszolt meghívói (csak a vezető látja) */
export function selectPendingInvites(db: DbClient, shopId: string) {
  return db
    .from("shop_invites")
    .select("id, email, expires_at, created_at")
    .eq("shop_id", shopId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
}

export function insertInvite(db: DbClient, shopId: string, email: string) {
  return db.from("shop_invites").insert({ shop_id: shopId, email }).select("id, token").single();
}

export function revokeInvite(db: DbClient, inviteId: string) {
  return db.from("shop_invites").update({ status: "revoked" }).eq("id", inviteId).select("id").maybeSingle();
}

export function selectInviteByToken(db: DbClient, token: string) {
  return db.rpc("get_shop_invite", { p_token: token });
}

export function acceptInvite(db: DbClient, token: string) {
  return db.rpc("accept_shop_invite", { p_token: token });
}

export function declineInvite(db: DbClient, token: string) {
  return db.rpc("decline_shop_invite", { p_token: token });
}

export function leaveShop(db: DbClient) {
  return db.rpc("leave_shop");
}

export function removeMember(db: DbClient, barberId: string) {
  return db.rpc("remove_shop_member", { p_barber_id: barberId });
}

/** A vezető áttekintése a tagok naptáráról (magánprogram csak „foglalt”) */
export function selectShopCalendar(db: DbClient, from: string, to: string) {
  return db.rpc("get_shop_calendar", { p_from: from, p_to: to });
}
