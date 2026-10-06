import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/shared/config/env";
import type { Database } from "@/shared/types/database.types";
import type { DbClient } from "./server-client";

/**
 * Teljes jogú (RLS-t megkerülő) kliens – KIZÁRÓLAG szerveroldali háttérfeladatokra (pl. a push-küldő).
 * Felhasználói kérésből csak szűken, a saját adatára használjuk.
 */
export function createAdminClient(): DbClient {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Hiányzik a SUPABASE_SECRET_KEY (lásd .env.example).");
  return createClient<Database>(supabaseEnv().url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
