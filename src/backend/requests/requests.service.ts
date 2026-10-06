import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import { formatPhone } from "@/shared/validation/phone";
import * as q from "./requests.queries";

// =============================================================================
// Függő kérések: lista, jóváhagyás, elutasítás, lemondás (barber és vendég is)
// =============================================================================

type Result = { ok: true } | { ok: false; error: string };

export type PendingRequest = {
  id: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  createdAt: string;
  note: string | null;
  serviceName: string;
  durationMin: number;
  price: number;
  customerName: string;
  customerPhone: string | null;
};

export async function listPendingRequests(barberId: string): Promise<PendingRequest[]> {
  const { data } = await q.selectPendingRequests(await createClient(), barberId);
  return (data ?? []).map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    expiresAt: b.expires_at!,
    createdAt: b.created_at,
    note: b.customer_note,
    serviceName: b.service?.name ?? "",
    durationMin: b.service?.duration_min ?? 0,
    price: Number(b.service?.price ?? 0),
    customerName: b.customer?.full_name ?? b.guest_name ?? "Vendég",
    customerPhone: b.customer?.phone ? formatPhone(b.customer.phone) : b.guest_phone,
  }));
}

export async function countPendingRequests(barberId: string): Promise<number> {
  const { count } = await q.countPendingRequests(await createClient(), barberId);
  return count ?? 0;
}

// A függvények saját üzenetei magyarok (lejárt, határidő, jogosultság)
function toResult(error: { code?: string; message?: string } | null, fallback: string): Result {
  if (!error) return { ok: true };
  const own = ["22023", "42501"].includes(error.code ?? "") ? error.message : null;
  return { ok: false, error: own ?? dbErrorMessage(error, fallback) };
}

export async function approveRequest(bookingId: string): Promise<Result> {
  const { error } = await q.approveBooking(await createClient(), bookingId);
  return toResult(error, "Nem sikerült jóváhagyni.");
}

export async function rejectRequest(bookingId: string, note: string | null): Promise<Result> {
  const { error } = await q.rejectBooking(await createClient(), bookingId, note);
  return toResult(error, "Nem sikerült elutasítani.");
}

/** Lemondás – a vendég és a barber is ezt hívja; az adatbázis dönti el, kinek mit szabad */
export async function cancelBooking(bookingId: string, note: string | null): Promise<Result> {
  const { error } = await q.cancelBooking(await createClient(), bookingId, note);
  return toResult(error, "Nem sikerült lemondani.");
}
