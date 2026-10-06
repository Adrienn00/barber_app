import "server-only";
import { createAdminClient } from "@/backend/core/admin-client";
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

/**
 * Fiók végleges törlése (spec 11., dontesek.md 3. és 8.):
 * 1. a jövőbeli foglalások lemondása (a másik fél értesítést kap), a múltbeliek anonimizálása;
 * 2. a profilképek törlése a tárhelyről;
 * 3. a bejelentkezési fiók törlése – a profil, barberprofil, naptár, értesítések kaszkádban törlődnek.
 */
export async function deleteMyAccount(userId: string, barberId: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await q.prepareAccountDeletion(await createClient());
  if (error) {
    const own = ["22023", "42501"].includes(error.code ?? "") ? error.message : null;
    return { ok: false, error: own ?? dbErrorMessage(error, "Nem sikerült törölni a fiókot.") };
  }

  const admin = createAdminClient();
  if (barberId) {
    const { data: shops } = await q.selectOwnedShopIds(admin, barberId);
    const files = await q.listAvatarFiles(admin, [`barbers/${barberId}`, ...(shops ?? []).map((s) => `shops/${s.id}`)]);
    if (files.length) await q.removeAvatarFiles(admin, files);
  }

  const { error: deleteError } = await q.deleteAuthUser(admin, userId);
  if (deleteError) return { ok: false, error: "Nem sikerült törölni a fiókot. Próbáld újra később." };
  return { ok: true };
}
