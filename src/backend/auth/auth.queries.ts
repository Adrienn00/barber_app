import "server-only";
import type { DbClient } from "@/backend/core/server-client";

// =============================================================================
// Auth – Supabase-hívások (bejelentkezés, a felhasználó profil- és barbersora).
// Csak adatot kér le / ír; a döntések az auth.service.ts-ben vannak.
// =============================================================================

export function selectProfile(db: DbClient, userId: string) {
  return db.from("profiles").select("full_name, phone, is_admin, terms_accepted_at").eq("id", userId).maybeSingle();
}

export function selectBarberOfUser(db: DbClient, userId: string) {
  return db
    .from("barbers")
    .select("id, slug, display_name, status, reject_reason, shop_id")
    .eq("user_id", userId)
    .maybeSingle();
}

/** Az egység, amelyet a barber vezet (ha van) */
export function selectOwnedShop(db: DbClient, barberId: string) {
  return db.from("shops").select("id, slug, name, status, reject_reason").eq("owner_barber_id", barberId).maybeSingle();
}

export function getVerifiedClaims(db: DbClient) {
  return db.auth.getClaims();
}

export function signInWithPassword(db: DbClient, email: string, password: string) {
  return db.auth.signInWithPassword({ email, password });
}

export function signUp(
  db: DbClient,
  input: { email: string; password: string; redirectTo: string; metadata: Record<string, string> },
) {
  return db.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: input.redirectTo, data: input.metadata },
  });
}

export function signInWithGoogle(db: DbClient, redirectTo: string) {
  return db.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
}

export function exchangeCodeForSession(db: DbClient, code: string) {
  return db.auth.exchangeCodeForSession(code);
}

export function signOut(db: DbClient) {
  return db.auth.signOut();
}

/** A Supabase Auth nyilvános beállításai (pl. be van-e kapcsolva a Google) */
export async function fetchAuthSettings(url: string, publishableKey: string) {
  const res = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return (await res.json()) as { external?: { google?: boolean } };
}
