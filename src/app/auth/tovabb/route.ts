import { NextResponse, type NextRequest } from "next/server";
import { destinationAfterLogin, getCurrentUser } from "@/backend/auth/auth.service";
import { ROUTES, safeNextPath } from "@/shared/config/routes";

// Belépés / regisztráció után ide jövünk: itt már biztosan él a bejelentkezés,
// így megbízhatóan eldönthető, hova menjen a felhasználó (profil, naptár, platform, vagy a kért oldal).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(ROUTES.login, origin));
  const next = safeNextPath(searchParams.get("next"));
  return NextResponse.redirect(new URL(destinationAfterLogin(user, next), origin));
}
