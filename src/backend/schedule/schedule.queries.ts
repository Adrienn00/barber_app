import "server-only";
import type { DbClient } from "@/backend/core/server-client";
import type { Database } from "@/shared/types/database.types";
import type { WorkingHoursSlot } from "@/shared/validation/schedule";

// =============================================================================
// Munkaidő és foglalási szabályok – Supabase-hívások (RLS: csak a saját)
// =============================================================================

type SettingsUpdate = Database["public"]["Tables"]["barber_settings"]["Update"];

export function selectWorkingHours(db: DbClient, barberId: string) {
  return db
    .from("working_hours")
    .select("weekday, start_time, end_time")
    .eq("barber_id", barberId)
    .order("weekday")
    .order("start_time");
}

/** A teljes hét cseréje egyben (adatbázis-függvény: vagy minden elmentődik, vagy semmi) */
export function replaceWorkingHours(db: DbClient, slots: WorkingHoursSlot[]) {
  return db.rpc("set_my_working_hours", { p_slots: slots });
}

export function selectSettings(db: DbClient, barberId: string) {
  return db
    .from("barber_settings")
    .select("min_notice_min, max_days_ahead, approval_timeout_min, cancel_limit_hours, buffer_min, slot_step_min")
    .eq("barber_id", barberId)
    .single();
}

export function updateSettings(db: DbClient, barberId: string, fields: SettingsUpdate) {
  return db.from("barber_settings").update(fields).eq("barber_id", barberId).select("barber_id").maybeSingle();
}

/** Hány aktív szolgáltatása van a barbernek (a „Kezdő lépések” dobozhoz) */
export function countActiveServices(db: DbClient, barberId: string) {
  return db.from("services").select("id", { count: "exact", head: true }).eq("barber_id", barberId).eq("is_active", true);
}

/** Hány munkaidő-sávja van a barbernek */
export function countWorkingHours(db: DbClient, barberId: string) {
  return db.from("working_hours").select("id", { count: "exact", head: true }).eq("barber_id", barberId);
}
