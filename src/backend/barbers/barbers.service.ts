import "server-only";
import type { BarberSummary } from "@/backend/auth/auth.service";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import type { BarberStatus } from "@/shared/types/domain";
import type { BarberApplicationInput } from "@/shared/validation/forms";
import { formatPhone } from "@/shared/validation/phone";
import * as q from "./barbers.queries";

// =============================================================================
// Barberek – barberjelentkezés és barberprofil
// =============================================================================

export type BarberApplication = BarberApplicationInput & { status: BarberStatus; rejectReason: string | null };

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
