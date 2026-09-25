import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";

export const PASSWORD = "Jelszo123!";

/** A seed.sql rögzített azonosítói */
export const ID = {
  users: {
    admin: "10000000-0000-0000-0000-000000000001",
    peti: "10000000-0000-0000-0000-000000000002",
    laci: "10000000-0000-0000-0000-000000000003",
    zoli: "10000000-0000-0000-0000-000000000004",
    anna: "10000000-0000-0000-0000-000000000005",
    bela: "10000000-0000-0000-0000-000000000006",
  },
  barbers: {
    peti: "20000000-0000-0000-0000-000000000001",
    laci: "20000000-0000-0000-0000-000000000002",
    zoli: "20000000-0000-0000-0000-000000000003",
  },
  services: {
    petiHajvagas: "30000000-0000-0000-0000-000000000101",
    petiInactive: "30000000-0000-0000-0000-000000000104",
    laciHajvagas: "30000000-0000-0000-0000-000000000201",
    zoliHajvagas: "30000000-0000-0000-0000-000000000301",
  },
} as const;

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Bejelentkezés nélküli látogató */
export function anonClient(): SupabaseClient {
  return createClient(inject("supabaseUrl"), inject("publishableKey"), options);
}

/** Minden RLS-t megkerülő kliens – csak tesztadatok előkészítésére */
export function serviceClient(): SupabaseClient {
  return createClient(inject("supabaseUrl"), inject("secretKey"), options);
}

/** Bejelentkezett felhasználó kliense (seed fiók vagy tesztben létrehozott) */
export async function userClient(email: string, password = PASSWORD): Promise<SupabaseClient> {
  const client = createClient(inject("supabaseUrl"), inject("publishableKey"), options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Bejelentkezés sikertelen (${email}): ${error.message}`);
  return client;
}
