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
