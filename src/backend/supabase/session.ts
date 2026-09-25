import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabaseEnv } from "@/shared/config/env";
import type { Database } from "@/shared/types/database.types";

/**
 * Minden kérésnél frissíti a Supabase munkamenet sütijeit.
 * A szerepkör szerinti átirányítás a 2. fázisban kerül ide; a valódi védelem az RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Kitöltetlen .env.local mellett is induljon el az oldal (a kezdőlap jelzi a hibát).
  if (!hasSupabaseEnv()) return response;

  const { url, publishableKey } = supabaseEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Ne tegyél kódot a createServerClient és a getClaims közé: a getClaims frissíti a tokent.
  await supabase.auth.getClaims();

  return response;
}
