import "server-only";
import { hasSupabaseEnv, supabaseEnv } from "@/shared/config/env";

export type SupabaseHealth = { ok: true } | { ok: false; reason: string };

/** Ellenőrzi, hogy a Supabase projekt elérhető-e és elfogadja-e a kulcsot. */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  if (!hasSupabaseEnv()) {
    return { ok: false, reason: "Hiányzik a .env.local (lásd .env.example)." };
  }
  const { url, publishableKey: key } = supabaseEnv();

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, reason: `A Supabase ${res.status} hibakóddal válaszolt – ellenőrizd a kulcsot.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "A Supabase nem érhető el – ellenőrizd az URL-t." };
  }
}
