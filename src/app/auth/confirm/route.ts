import { NextResponse, type NextRequest } from "next/server";
import { confirmEmailToken } from "@/backend/auth/auth.service";
import { ROUTES, afterLoginPath, safeNextPath } from "@/shared/config/routes";

// Az e-mailes linkek ide hoznak (regisztráció megerősítése, jelszó-visszaállítás):
// /auth/confirm?token_hash=…&type=recovery&next=/uj-jelszo – bármelyik böngészőben megnyitható.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "";
  const next = safeNextPath(searchParams.get("next"));

  const ok = tokenHash ? await confirmEmailToken(tokenHash, type) : false;
  if (!ok) return NextResponse.redirect(new URL(`${ROUTES.login}?hiba=link`, origin));
  return NextResponse.redirect(new URL(afterLoginPath(next), origin));
}
