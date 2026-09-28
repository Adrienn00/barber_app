import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import type { ServiceData } from "@/shared/validation/pricelist";
import * as q from "./pricelist.queries";

// =============================================================================
// Árlista – minden barber maga állítja be, mennyi idő neki egy szolgáltatás és mennyibe kerül.
// Az időtartam módosítása csak az ÚJ foglalásokra hat; a meglévők hossza nem változik.
// =============================================================================

type Result = { ok: true } | { ok: false; error: string };

export type MyService = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  isActive: boolean;
};

export async function listMyServicesForEdit(barberId: string): Promise<MyService[]> {
  const { data } = await q.selectMyServices(await createClient(), barberId);
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    durationMin: s.duration_min,
    price: Number(s.price),
    isActive: s.is_active,
  }));
}

/** Új szolgáltatás (a lista végére kerül) vagy meglévő módosítása */
export async function saveService(barberId: string, serviceId: string | null, data: ServiceData): Promise<Result> {
  const db = await createClient();
  const fields = { name: data.name, duration_min: data.durationMin, price: data.price };

  if (serviceId) {
    const { data: saved, error } = await q.updateService(db, serviceId, fields);
    if (error || !saved) return { ok: false, error: dbErrorMessage(error, "Nem sikerült menteni.") };
    return { ok: true };
  }

  const { data: existing } = await q.selectMyServices(db, barberId);
  const nextOrder = Math.max(0, ...(existing ?? []).map((s) => s.sort_order)) + 1;
  const { error } = await q.insertService(db, { ...fields, barber_id: barberId, sort_order: nextOrder });
  return error ? { ok: false, error: dbErrorMessage(error, "Nem sikerült menteni.") } : { ok: true };
}

/** Elrejtés / újra megjelenítés (a vendégek csak az aktívat látják és foglalhatják) */
export async function setServiceActive(serviceId: string, isActive: boolean): Promise<Result> {
  const { data, error } = await q.updateService(await createClient(), serviceId, { is_active: isActive });
  return error || !data ? { ok: false, error: dbErrorMessage(error, "Nem sikerült.") } : { ok: true };
}

/** Törlés – csak ha még senki nem foglalta; különben elrejteni kell (a régi foglalások megmaradnak) */
export async function removeService(serviceId: string): Promise<Result> {
  const { data, error } = await q.deleteService(await createClient(), serviceId);
  if (error?.code === "23503") {
    return { ok: false, error: "Erre a szolgáltatásra már van foglalás, ezért nem törölhető – rejtsd el helyette." };
  }
  return error || !data ? { ok: false, error: dbErrorMessage(error, "Nem sikerült törölni.") } : { ok: true };
}

/** Sorrend: a szolgáltatás egy hellyel feljebb vagy lejjebb kerül */
export async function moveService(barberId: string, serviceId: string, direction: "up" | "down"): Promise<Result> {
  const db = await createClient();
  const { data } = await q.selectMyServices(db, barberId);
  const list = data ?? [];
  const index = list.findIndex((s) => s.id === serviceId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return { ok: true };

  // Egyértelmű sorszámok (1, 2, 3…), a két elem helyet cserél
  const reordered = [...list];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  const results = await Promise.all(
    reordered.map((s, i) => (s.sort_order === i + 1 ? null : q.updateService(db, s.id, { sort_order: i + 1 }))),
  );
  const failed = results.find((r) => r?.error);
  return failed?.error ? { ok: false, error: dbErrorMessage(failed.error, "Nem sikerült a sorrend.") } : { ok: true };
}
