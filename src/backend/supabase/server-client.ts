import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/shared/config/env";
import type { Database } from "@/shared/types/database.types";

/**
 * Supabase kliens szerver komponensekhez, server actionökhöz és route handlerekhez.
 * Minden kéréshez újat kell létrehozni (ne legyen globális).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Szerver komponensből nem lehet sütit írni; a munkamenetet a proxy frissíti.
        }
      },
    },
  });
}
