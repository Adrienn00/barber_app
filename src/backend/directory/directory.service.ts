import "server-only";
import { createClient } from "@/backend/core/server-client";
import type { DirectoryEntry, OpeningDay, PublicBarber, PublicShop } from "@/shared/types/directory";
import { formatPhone } from "@/shared/validation/phone";
import { WEEK_DAYS } from "@/shared/validation/schedule";
import * as q from "./directory.queries";

// =============================================================================
// Nyilvános oldalak: barberlista, barber oldala, egység oldala (csapattal)
// =============================================================================

export async function getDirectory(search: string | null): Promise<DirectoryEntry[]> {
  const { data } = await q.listDirectory(await createClient(), search);
  return (data ?? []).map((r) => ({
    kind: r.kind === "shop" ? "shop" : "barber",
    slug: r.slug,
    name: r.name,
    city: r.city,
    address: r.address,
    bio: r.bio,
    memberCount: r.member_count,
    minPrice: r.min_price === null ? null : Number(r.min_price),
  }));
}

/** Egy barber nyilvános adatai szolgáltatásokkal és nyitvatartással; null, ha nincs ilyen (jóváhagyott) */
export async function getPublicBarber(slug: string): Promise<PublicBarber | null> {
  const db = await createClient();
  const { data: barber } = await q.selectBarberBySlug(db, slug);
  if (!barber) return null;
  return loadBarberDetails(barber);
}

async function loadBarberDetails(barber: {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  city: string;
  address: string;
  phone: string;
  instagram: string | null;
  shop_id: string | null;
}): Promise<PublicBarber> {
  const db = await createClient();
  const [{ data: services }, { data: hours }, shop] = await Promise.all([
    q.selectActiveServices(db, barber.id),
    q.selectWorkingHours(db, barber.id),
    barber.shop_id ? q.selectShopById(db, barber.shop_id) : Promise.resolve({ data: null }),
  ]);

  const openingHours: OpeningDay[] = WEEK_DAYS.map(({ weekday, label }) => ({
    weekday,
    label,
    ranges: (hours ?? [])
      .filter((h) => h.weekday === weekday)
      .map((h) => `${h.start_time.slice(0, 5)}–${h.end_time.slice(0, 5)}`),
  }));

  const serviceList = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.duration_min,
    price: Number(s.price),
  }));

  return {
    id: barber.id,
    slug: barber.slug,
    name: barber.display_name,
    bio: barber.bio,
    city: barber.city,
    address: barber.address,
    phone: formatPhone(barber.phone),
    instagram: barber.instagram,
    services: serviceList,
    openingHours,
    shop: shop.data ? { slug: shop.data.slug, name: shop.data.name } : null,
    bookable: serviceList.length > 0 && (hours ?? []).length > 0,
  };
}

/** Egy egység nyilvános oldala a foglalható csapattal; null, ha nincs ilyen (jóváhagyott) */
export async function getPublicShop(slug: string): Promise<PublicShop | null> {
  const db = await createClient();
  const { data: shop } = await q.selectShopBySlug(db, slug);
  if (!shop) return null;

  const { data: members } = await q.selectShopMembers(db, shop.id);
  const barbers = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: barber } = await q.selectBarberBySlug(db, m.slug);
      return barber ? loadBarberDetails(barber) : null;
    }),
  );

  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    bio: shop.bio,
    city: shop.city,
    address: shop.address,
    phone: formatPhone(shop.phone),
    instagram: shop.instagram,
    members: barbers.filter((b): b is PublicBarber => b !== null && b.bookable),
  };
}
