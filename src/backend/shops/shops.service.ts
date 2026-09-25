import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import { toBucharestLocal } from "@/shared/datetime/datetime";
import type { BarberStatus } from "@/shared/types/domain";
import type { ShopInput } from "@/shared/validation/forms";
import { formatPhone } from "@/shared/validation/phone";
import * as q from "./shops.queries";

// =============================================================================
// Egységek (üzletek): létrehozás, tagok, meghívók, csatlakozás/kilépés, a vezető áttekintése
// Döntések: docs/dontesek.md 12–16.
// =============================================================================

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };

export type ShopDetails = ShopInput & {
  id: string;
  status: BarberStatus;
  rejectReason: string | null;
  isListed: boolean;
};

export type ShopMember = { barberId: string; displayName: string; slug: string; isOwner: boolean };
export type ShopInvite = { id: string; email: string; expiresAt: string };

export type InvitePreview = {
  shopName: string;
  shopCity: string;
  shopSlug: string;
  email: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  isExpired: boolean;
  /** A bejelentkezett felhasználó e-mail-címére szól-e */
  isForMe: boolean;
};

/** Egy tag foglalása vagy „foglalt” ideje a vezető áttekintésében */
export type ShopCalendarEntry = {
  barberId: string;
  barberName: string;
  kind: "booking" | "busy";
  startLocal: string;
  endLocal: string;
  status: string | null;
  serviceName: string | null;
  customerName: string | null;
};

// A saját függvényeink magyar üzenetei közvetlenül megjeleníthetők
function ownMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  return error && ["22023", "42501", "P0002"].includes(error.code ?? "") && error.message
    ? error.message
    : dbErrorMessage(error, fallback);
}

// -----------------------------------------------------------------------------
// Egység adatai
// -----------------------------------------------------------------------------

export async function getShop(shopId: string): Promise<ShopDetails | null> {
  const { data } = await q.selectShop(await createClient(), shopId);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    city: data.city,
    address: data.address,
    phone: formatPhone(data.phone),
    bio: data.bio ?? "",
    instagram: data.instagram ?? "",
    status: data.status,
    rejectReason: data.reject_reason,
    isListed: data.is_listed,
  };
}

/**
 * Egység létrehozása (jóváhagyásra vár), vagy a meglévő adatainak mentése.
 * Elutasított egységnél a mentés egyben újraküldés.
 */
export async function saveShop(
  ownerBarberId: string,
  existing: { id: string; status: BarberStatus } | null,
  input: ShopInput,
): Promise<Result<{ id: string }>> {
  const db = await createClient();
  const row = {
    name: input.name,
    slug: input.slug,
    city: input.city,
    address: input.address,
    phone: input.phone,
    bio: input.bio || null,
    instagram: input.instagram || null,
  };

  const saved = existing
    ? await q.updateShop(db, existing.id, row)
    : await q.insertShop(db, { ...row, owner_barber_id: ownerBarberId });
  if (saved.error) {
    if (saved.error.code === "23505") return { ok: false, error: "Ez a link már foglalt, válassz másikat.", field: "slug" };
    return { ok: false, error: ownMessage(saved.error, "Nem sikerült menteni.") };
  }
  if (!saved.data) return { ok: false, error: "Az egység nem található." };

  if (existing?.status === "rejected") {
    const { error } = await q.reapplyShop(db);
    if (error) return { ok: false, error: ownMessage(error, "Nem sikerült újraküldeni.") };
  }
  return { ok: true, id: saved.data.id };
}

export async function listMembers(shopId: string): Promise<ShopMember[]> {
  const { data } = await q.selectMembers(await createClient(), shopId);
  return (data ?? []).map((m) => ({
    barberId: m.barber_id,
    displayName: m.display_name,
    slug: m.slug,
    isOwner: m.is_owner,
  }));
}

// -----------------------------------------------------------------------------
// Meghívók
// -----------------------------------------------------------------------------

export async function listPendingInvites(shopId: string): Promise<ShopInvite[]> {
  const { data } = await q.selectPendingInvites(await createClient(), shopId);
  return (data ?? []).map((i) => ({ id: i.id, email: i.email, expiresAt: i.expires_at }));
}

/** Meghívó küldése. Visszaadja a titkos tokent – ebből lesz a meghívó link (e-mail a 8. fázistól). */
export async function inviteBarber(shopId: string, email: string): Promise<Result<{ token: string }>> {
  const { data, error } = await q.insertInvite(await createClient(), shopId, email);
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, error: "Erre a címre már van függő meghívód.", field: "email" };
    if (error?.code === "42501") return { ok: false, error: "Meghívót csak jóváhagyott egység küldhet." };
    return { ok: false, error: dbErrorMessage(error, "Nem sikerült a meghívás.") };
  }
  return { ok: true, token: data.token };
}

export async function revokeInvite(inviteId: string): Promise<Result> {
  const { data, error } = await q.revokeInvite(await createClient(), inviteId);
  if (error || !data) return { ok: false, error: dbErrorMessage(error, "A meghívó már nem vonható vissza.") };
  return { ok: true };
}

export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const { data } = await q.selectInviteByToken(await createClient(), token);
  const row = data?.[0];
  if (!row) return null;
  return {
    shopName: row.shop_name,
    shopCity: row.shop_city,
    shopSlug: row.shop_slug,
    email: row.email,
    status: row.status,
    isExpired: row.is_expired,
    isForMe: row.is_for_me ?? false,
  };
}

export async function acceptInvite(token: string): Promise<Result<{ shopId: string }>> {
  const { data, error } = await q.acceptInvite(await createClient(), token);
  if (error || !data) return { ok: false, error: ownMessage(error, "Nem sikerült csatlakozni.") };
  return { ok: true, shopId: data };
}

export async function declineInvite(token: string): Promise<Result> {
  const { error } = await q.declineInvite(await createClient(), token);
  return error ? { ok: false, error: ownMessage(error, "Nem sikerült.") } : { ok: true };
}

// -----------------------------------------------------------------------------
// Kilépés, tag eltávolítása
// -----------------------------------------------------------------------------

export async function leaveShop(): Promise<Result> {
  const { error } = await q.leaveShop(await createClient());
  return error ? { ok: false, error: ownMessage(error, "Nem sikerült kilépni.") } : { ok: true };
}

export async function removeMember(barberId: string): Promise<Result> {
  const { error } = await q.removeMember(await createClient(), barberId);
  return error ? { ok: false, error: ownMessage(error, "Nem sikerült eltávolítani.") } : { ok: true };
}

// -----------------------------------------------------------------------------
// A vezető áttekintése (csak olvasható)
// -----------------------------------------------------------------------------

export async function getShopCalendar(from: string, to: string): Promise<ShopCalendarEntry[]> {
  const { data } = await q.selectShopCalendar(await createClient(), from, to);
  return (data ?? []).map((r) => ({
    barberId: r.barber_id,
    barberName: r.barber_name,
    kind: r.kind === "busy" ? "busy" : "booking",
    startLocal: toBucharestLocal(r.starts_at),
    endLocal: toBucharestLocal(r.ends_at),
    status: r.status,
    serviceName: r.service_name,
    customerName: r.customer_name,
  }));
}
