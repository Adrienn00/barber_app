import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authErrorMessage } from "@/backend/core/errors";
import { type DbClient, createClient } from "@/backend/core/server-client";
import { supabaseEnv } from "@/shared/config/env";
import { ROUTES, loginPath } from "@/shared/config/routes";
import type { BarberStatus } from "@/shared/types/domain";
import * as q from "./auth.queries";

// =============================================================================
// Auth – ki van bejelentkezve, mit tehet, hova menjen; belépés/regisztráció/kilépés
// =============================================================================

export type BarberSummary = {
  id: string;
  slug: string;
  displayName: string;
  status: BarberStatus;
  rejectReason: string | null;
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isAdmin: boolean;
  termsAccepted: boolean;
  /** Barberjelentkezés / barberprofil, ha van */
  barber: BarberSummary | null;
  /** Név, telefon és elfogadott feltételek megvannak */
  isProfileComplete: boolean;
  isApprovedBarber: boolean;
};

async function loadUserContext(db: DbClient, userId: string, email: string): Promise<CurrentUser> {
  const [{ data: profile }, { data: barber }] = await Promise.all([
    q.selectProfile(db, userId),
    q.selectBarberOfUser(db, userId),
  ]);

  const fullName = profile?.full_name ?? null;
  const phone = profile?.phone ?? null;
  const termsAccepted = Boolean(profile?.terms_accepted_at);

  return {
    id: userId,
    email,
    fullName,
    phone,
    isAdmin: profile?.is_admin ?? false,
    termsAccepted,
    barber: barber
      ? {
          id: barber.id,
          slug: barber.slug,
          displayName: barber.display_name,
          status: barber.status,
          rejectReason: barber.reject_reason,
        }
      : null,
    isProfileComplete: Boolean(fullName && phone && termsAccepted),
    isApprovedBarber: barber?.status === "approved",
  };
}

/** A bejelentkezett felhasználó (kérésenként egyszer kérdezi le), vagy null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const db = await createClient();
  const { data } = await q.getVerifiedClaims(db);
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return loadUserContext(db, claims.sub, (claims.email as string | undefined) ?? "");
});

/** Hova kerüljön belépés után: hiányos profil → profil; admin → platform; barber → naptár; vendég → főoldal. */
export function homePathFor(user: CurrentUser): string {
  if (!user.isProfileComplete) return ROUTES.profile;
  if (user.isAdmin) return ROUTES.platform;
  if (user.isApprovedBarber) return ROUTES.barberCalendar;
  return ROUTES.home;
}

/** Belépés után: ha hiányos a profil, előbb azt kell kitölteni, utána megy a kért oldalra. */
export function destinationAfterLogin(user: CurrentUser, nextPath: string | null): string {
  if (!user.isProfileComplete) {
    return nextPath ? `${ROUTES.profile}?next=${encodeURIComponent(nextPath)}` : ROUTES.profile;
  }
  return nextPath ?? homePathFor(user);
}

// -----------------------------------------------------------------------------
// Őrök: az oldalak elején hívjuk; ha a feltétel nem teljesül, átirányítanak.
// (A valódi adatvédelem az adatbázisban, RLS-sel történik – ezek kényelmi rétegek.)
// -----------------------------------------------------------------------------

export async function requireUser(nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(nextPath));
  return user;
}

export async function requireCompleteProfile(nextPath: string): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (!user.isProfileComplete) redirect(`${ROUTES.profile}?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireApprovedBarber(nextPath: string): Promise<CurrentUser> {
  const user = await requireCompleteProfile(nextPath);
  if (!user.isApprovedBarber) redirect(ROUTES.becomeBarber);
  return user;
}

export async function requireAdmin(nextPath: string): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (!user.isAdmin) redirect(ROUTES.home);
  return user;
}

// -----------------------------------------------------------------------------
// Belépés, regisztráció, kilépés
// -----------------------------------------------------------------------------

/** Belépés/regisztráció eredménye. Siker után az /auth/tovabb dönti el, hova menjen a felhasználó. */
export type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; error: string };

/** Az app címe (pl. http://localhost:3000) – a visszairányító linkekhez */
async function appOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function callbackUrl(nextPath: string | null): Promise<string> {
  const base = `${await appOrigin()}${ROUTES.authCallback}`;
  return nextPath ? `${base}?next=${encodeURIComponent(nextPath)}` : base;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const db = await createClient();
  const { data, error } = await q.signInWithPassword(db, email, password);
  if (error || !data.user) return { ok: false, error: authErrorMessage(error) };
  return { ok: true };
}

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  nextPath: string | null;
}): Promise<AuthResult> {
  const db = await createClient();
  const { data, error } = await q.signUp(db, {
    email: input.email,
    password: input.password,
    redirectTo: await callbackUrl(input.nextPath),
    // A profilt az adatbázis trigger hozza létre ezekből
    metadata: { full_name: input.fullName, phone: input.phone, terms_accepted: "true" },
  });
  if (error || !data.user) return { ok: false, error: authErrorMessage(error) };
  // Ha a Supabase-ben be van kapcsolva az e-mail megerősítés, még nincs munkamenet
  return { ok: true, needsEmailConfirmation: !data.session };
}

/** Google-belépés indítása: a visszaadott címre kell irányítani a böngészőt. */
export async function startGoogleSignIn(nextPath: string | null): Promise<{ url: string } | { error: string }> {
  const db = await createClient();
  const { data, error } = await q.signInWithGoogle(db, await callbackUrl(nextPath));
  if (error || !data.url) return { error: authErrorMessage(error) };
  return { url: data.url };
}

/** Google / e-mail megerősítés visszatérése: a kapott kódot munkamenetre cseréli. */
export async function completeAuthCallback(code: string): Promise<boolean> {
  const { data, error } = await q.exchangeCodeForSession(await createClient(), code);
  return !error && Boolean(data.user);
}

export async function signOut(): Promise<void> {
  await q.signOut(await createClient());
}

/** Be van-e kapcsolva a Google-belépés a Supabase-ben (5 percig gyorsítótárazva). */
export async function isGoogleAuthEnabled(): Promise<boolean> {
  try {
    const { url, publishableKey } = supabaseEnv();
    const settings = await q.fetchAuthSettings(url, publishableKey);
    return Boolean(settings?.external?.google);
  } catch {
    return false;
  }
}
