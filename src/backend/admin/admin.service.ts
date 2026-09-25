import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import type { BarberStatus } from "@/shared/types/domain";
import * as q from "./admin.queries";

// =============================================================================
// Platform admin – barberek jóváhagyása, felfüggesztése, alapszámok
// =============================================================================

export type AdminBarber = {
  id: string;
  displayName: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  bio: string | null;
  instagram: string | null;
  status: BarberStatus;
  rejectReason: string | null;
  createdAt: string;
  approvedAt: string | null;
};

export type AdminShop = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  bio: string | null;
  instagram: string | null;
  status: BarberStatus;
  rejectReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  ownerName: string;
};

export type AdminStats = {
  barbers_approved: number;
  barbers_pending: number;
  barbers_suspended: number;
  shops_approved: number;
  shops_pending: number;
  customers: number;
  bookings_total: number;
  bookings_upcoming: number;
};

export async function listBarbersForAdmin(): Promise<AdminBarber[]> {
  const { data } = await q.selectAllBarbers(await createClient());
  return (data ?? []).map((b) => ({
    id: b.id,
    displayName: b.display_name,
    slug: b.slug,
    city: b.city,
    address: b.address,
    phone: b.phone,
    bio: b.bio,
    instagram: b.instagram,
    status: b.status,
    rejectReason: b.reject_reason,
    createdAt: b.created_at,
    approvedAt: b.approved_at,
  }));
}

export async function getAdminStats(): Promise<AdminStats | null> {
  const { data, error } = await q.fetchAdminStats(await createClient());
  if (error || !data) return null;
  return data as AdminStats;
}

export async function setBarberStatus(
  barberId: string,
  status: BarberStatus,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await q.setBarberStatus(await createClient(), barberId, status, reason);
  return error ? { ok: false, error: dbErrorMessage(error, "Nem sikerült a státuszváltás.") } : { ok: true };
}

export async function listShopsForAdmin(): Promise<AdminShop[]> {
  const { data } = await q.selectAllShops(await createClient());
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    city: s.city,
    address: s.address,
    phone: s.phone,
    bio: s.bio,
    instagram: s.instagram,
    status: s.status,
    rejectReason: s.reject_reason,
    createdAt: s.created_at,
    approvedAt: s.approved_at,
    ownerName: s.owner?.display_name ?? "",
  }));
}

export async function setShopStatus(
  shopId: string,
  status: BarberStatus,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await q.setShopStatus(await createClient(), shopId, status, reason);
  return error ? { ok: false, error: dbErrorMessage(error, "Nem sikerült a státuszváltás.") } : { ok: true };
}
