import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabaseEnv } from "@/shared/config/env";
import { GUEST_ONLY_ROUTES, ROUTES, isProtectedPath, loginPath } from "@/shared/config/routes";
import type { Database } from "@/shared/types/database.types";

/**
 * Minden kérés előtt fut (src/proxy.ts hívja):
 * 1. frissíti a Supabase bejelentkezési sütiket,
 * 2. védett oldalról bejelentkezés nélkül a belépésre irányít,
 * 3. bejelentkezve a belépés/regisztráció oldalról a főoldalra küld.
 * A szerepkört (barber, admin) az oldalak ellenőrzik; a valódi adatvédelem az RLS.
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
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!isLoggedIn && isProtectedPath(pathname)) {
    return redirectKeepingCookies(request, response, loginPath(pathname + search));
  }
  if (isLoggedIn && (GUEST_ONLY_ROUTES as readonly string[]).includes(pathname)) {
    return redirectKeepingCookies(request, response, ROUTES.home);
  }

  return response;
}

/** Átirányítás úgy, hogy a frissített bejelentkezési sütik is megmaradjanak */
function redirectKeepingCookies(request: NextRequest, response: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
