import "server-only";
import type { BarberSummary } from "@/backend/auth/auth.service";
import { newAvatarPath, processAvatarFile, removeAvatarFiles, uploadAvatarFile } from "@/backend/core/avatar";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import type { BarberStatus } from "@/shared/types/domain";
import type { BarberApplicationInput } from "@/shared/validation/forms";
import { formatPhone } from "@/shared/validation/phone";
import { avatarUrl } from "@/shared/config/storage";
import * as q from "./barbers.queries";

// =============================================================================
// Barberek – barberjelentkezés és barberprofil
// =============================================================================

export type BarberApplication = BarberApplicationInput & {
  status: BarberStatus;
  rejectReason: string | null;
  avatarUrl: string | null;
  avatarPath: string | null;
  isListed: boolean;
};

/** A saját jelentkezés részletei (az űrlap kitöltéséhez) */
export async function getMyBarberApplication(userId: string): Promise<BarberApplication | null> {
  const { data } = await q.selectApplicationOfUser(await createClient(), userId);
  if (!data) return null;
  return {
    displayName: data.display_name,
    slug: data.slug,
    city: data.city,
    address: data.address,
    phone: formatPhone(data.phone),
    bio: data.bio ?? "",
    instagram: data.instagram ?? "",
    status: data.status,
    rejectReason: data.reject_reason,
    avatarUrl: avatarUrl(data.avatar_path),
    avatarPath: data.avatar_path,
    isListed: data.is_listed,
  };
}

/**
 * Jelentkezés beküldése vagy javítása.
 * - nincs még jelentkezés → létrehozza (függő státusszal)
 * - függő → frissíti az adatokat
 * - elutasított → frissíti és újraküldi
 */
export async function saveMyBarberApplication(
  userId: string,
  existing: BarberSummary | null,
  input: BarberApplicationInput,
): Promise<{ ok: true } | { ok: false; error: string; field?: string }> {
  const db = await createClient();
  const row = {
    display_name: input.displayName,
    slug: input.slug,
    city: input.city,
    address: input.address,
    phone: input.phone,
    bio: input.bio || null,
    instagram: input.instagram || null,
  };

  const { error } = existing
    ? await q.updateBarber(db, existing.id, row)
    : await q.insertBarber(db, { ...row, user_id: userId });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ez a link már foglalt, válassz másikat.", field: "slug" };
    return { ok: false, error: dbErrorMessage(error) };
  }

  if (existing?.status === "rejected") {
    const { error: reapplyError } = await q.reapplyAsBarber(db);
    if (reapplyError) return { ok: false, error: dbErrorMessage(reapplyError) };
  }
  return { ok: true };
}

type Result = { ok: true } | { ok: false; error: string; field?: string };

/** Jóváhagyott barber profiljának mentése (a link változásakor a régi link megszűnik – dontesek.md 10.) */
export async function saveMyBarberProfile(barberId: string, input: BarberApplicationInput): Promise<Result> {
  const { error } = await q.updateBarber(await createClient(), barberId, {
    display_name: input.displayName,
    slug: input.slug,
    city: input.city,
    address: input.address,
    phone: input.phone,
    bio: input.bio || null,
    instagram: input.instagram || null,
  });
  if (error?.code === "23505") return { ok: false, error: "Ez a link már foglalt, válassz másikat.", field: "slug" };
  if (error) return { ok: false, error: dbErrorMessage(error) };
  return { ok: true };
}

/** Megjelenjen-e a nyilvános barberlistában (a link ettől függetlenül működik) */
export async function setMyListing(barberId: string, listed: boolean): Promise<Result> {
  const { error } = await q.updateBarber(await createClient(), barberId, { is_listed: listed });
  return error ? { ok: false, error: dbErrorMessage(error) } : { ok: true };
}

/** Profilkép cseréje (négyzetes, 512 px, webp – lásd core/avatar.ts). A régi kép törlődik. */
export async function replaceMyAvatar(barberId: string, oldPath: string | null, file: File): Promise<Result> {
  const processed = await processAvatarFile(file);
  if (!processed.ok) return processed;

  const db = await createClient();
  const path = newAvatarPath(`barbers/${barberId}`);
  const { error: uploadError } = await uploadAvatarFile(db, path, processed.bytes);
  if (uploadError) return { ok: false, error: "Nem sikerült feltölteni a képet." };

  const { error } = await q.updateBarber(db, barberId, { avatar_path: path });
  if (error) {
    await removeAvatarFiles(db, [path]);
    return { ok: false, error: dbErrorMessage(error) };
  }
  if (oldPath) await removeAvatarFiles(db, [oldPath]);
  return { ok: true };
}

export async function removeMyAvatar(barberId: string, path: string | null): Promise<Result> {
  const db = await createClient();
  const { error } = await q.updateBarber(db, barberId, { avatar_path: null });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (path) await removeAvatarFiles(db, [path]);
  return { ok: true };
}
