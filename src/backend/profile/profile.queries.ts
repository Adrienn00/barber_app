import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { Database } from "@/shared/types/database.types";

// =============================================================================
// Profil – Supabase-hívások
// =============================================================================

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export function updateProfile(db: DbClient, userId: string, fields: ProfileUpdate) {
  return db.from("profiles").update(fields).eq("id", userId);
}

/** Fióktörlés 1. lépés: foglalások lemondása / anonimizálása (adatbázis-függvény, a felhasználó nevében) */
export function prepareAccountDeletion(db: DbClient) {
  return db.rpc("prepare_account_deletion");
}

// --- Csak a teljes jogú (admin) klienssel -------------------------------------

/** A barber és az általa vezetett egység profilképei (a törléshez) */
export async function listAvatarFiles(admin: DbClient, folders: string[]) {
  const lists = await Promise.all(folders.map((f) => admin.storage.from("avatars").list(f)));
  return lists.flatMap((res, i) => (res.data ?? []).map((file) => `${folders[i]}/${file.name}`));
}

export function removeAvatarFiles(admin: DbClient, paths: string[]) {
  return admin.storage.from("avatars").remove(paths);
}

export function selectOwnedShopIds(admin: DbClient, barberId: string) {
  return admin.from("shops").select("id").eq("owner_barber_id", barberId);
}

/** Fióktörlés 2. lépés: a bejelentkezési fiók törlése (a profil és minden saját adat kaszkádban) */
export function deleteAuthUser(admin: DbClient, userId: string) {
  return admin.auth.admin.deleteUser(userId);
}
