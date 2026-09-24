import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

/** Supabase kliens böngészőben futó (client) komponensekhez. */
export function createClient() {
  const { url, publishableKey } = supabaseEnv();
  return createBrowserClient(url, publishableKey);
}
