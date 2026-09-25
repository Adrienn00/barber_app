import { NextResponse, type NextRequest } from "next/server";
import { completeAuthCallback } from "@/backend/auth/auth.service";
import { ROUTES, afterLoginPath, safeNextPath } from "@/shared/config/routes";

// Ide tér vissza a böngésző Google-belépés vagy e-mail megerősítés után.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const ok = code ? await completeAuthCallback(code) : false;
  if (!ok) return NextResponse.redirect(new URL(`${ROUTES.login}?hiba=belepes`, origin));
  return NextResponse.redirect(new URL(afterLoginPath(next), origin));
}
