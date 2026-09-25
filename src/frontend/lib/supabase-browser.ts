import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/shared/config/env";
import type { Database } from "@/shared/types/database.types";

/** Supabase kliens böngészőben futó (client) komponensekhez. */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
