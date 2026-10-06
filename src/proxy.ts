import type { NextRequest } from "next/server";
import { updateSession } from "@/backend/core/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Statikus fájlok, képek, a service worker, a manifest és a push-küldő (az adatbázis hívja) kihagyása
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|api/notifications|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
