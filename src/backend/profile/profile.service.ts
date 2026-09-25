import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import * as q from "./profile.queries";

// =============================================================================
// Profil – a felhasználó saját adatai (név, telefon, feltételek elfogadása)
// =============================================================================

export async function updateMyProfile(
  userId: string,
  input: { fullName: string; phone: string; acceptTerms: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await q.updateProfile(await createClient(), userId, {
    full_name: input.fullName,
    phone: input.phone,
    ...(input.acceptTerms ? { terms_accepted_at: new Date().toISOString() } : {}),
  });
  return error ? { ok: false, error: dbErrorMessage(error) } : { ok: true };
}
