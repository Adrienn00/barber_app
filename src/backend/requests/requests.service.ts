import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import { formatPhone } from "@/shared/validation/phone";
import * as q from "./requests.queries";

// =============================================================================
// Függő kérések: lista, jóváhagyás, elutasítás, lemondás (barber és vendég is); áthelyezés
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

/** A menü számjelzője: új foglalási kérések + áthelyezés utáni döntések */
export async function countPendingRequests(barberId: string): Promise<number> {
  const db = await createClient();
  const [requests, decisions] = await Promise.all([
    q.countPendingRequests(db, barberId),
    q.countRescheduleDecisions(db, barberId),
  ]);
  return (requests.count ?? 0) + (decisions.count ?? 0);
}

// A függvények saját üzenetei magyarok (lejárt, határidő, jogosultság, ütközés)
function toResult(error: { code?: string; message?: string } | null, fallback: string): Result {
  if (!error) return { ok: true };
  const own = ["22023", "42501", "23P01"].includes(error.code ?? "") ? error.message : null;
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

// -----------------------------------------------------------------------------
// Áthelyezés
// -----------------------------------------------------------------------------

export type OpenReschedule = {
  id: string;
  /** pending: a vendég válaszára vár; declined / expired: a barbernek kell döntenie */
  status: "pending" | "declined" | "expired";
  needsDecision: boolean;
  bookingId: string;
  oldStartsAt: string;
  oldEndsAt: string;
  newStartsAt: string;
  newEndsAt: string;
  expiresAt: string;
  note: string | null;
  serviceName: string;
  customerName: string;
  customerPhone: string | null;
};

export async function listOpenReschedules(barberId: string): Promise<OpenReschedule[]> {
  const { data } = await q.selectOpenReschedules(await createClient(), barberId);
  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status as OpenReschedule["status"],
    needsDecision: r.needs_decision,
    bookingId: r.booking?.id ?? "",
    oldStartsAt: r.booking?.starts_at ?? "",
    oldEndsAt: r.booking?.ends_at ?? "",
    newStartsAt: r.starts_at,
    newEndsAt: r.ends_at,
    expiresAt: r.expires_at,
    note: r.note,
    serviceName: r.booking?.service?.name ?? "",
    customerName: r.customer?.full_name ?? "Vendég",
    customerPhone: r.customer?.phone ? formatPhone(r.customer.phone) : null,
  }));
}

/** Áthelyezés: javaslat a vendégnek, vagy közvetlenül (ha már megbeszélték) */
export async function rescheduleBooking(
  bookingId: string,
  startsAt: string,
  mode: "propose" | "move",
  note: string | null,
): Promise<Result> {
  const db = await createClient();
  const { error } =
    mode === "propose"
      ? await q.proposeReschedule(db, bookingId, startsAt, note)
      : await q.moveBooking(db, bookingId, startsAt, note);
  return toResult(error, "Nem sikerült áthelyezni.");
}

export async function withdrawReschedule(rescheduleId: string): Promise<Result> {
  const { error } = await q.withdrawReschedule(await createClient(), rescheduleId);
  return toResult(error, "Nem sikerült visszavonni.");
}

/** A barber döntése elutasított / lejárt javaslat után: marad a régi (keep) vagy lemondja */
export async function resolveReschedule(rescheduleId: string, keep: boolean, note: string | null): Promise<Result> {
  const { error } = await q.resolveReschedule(await createClient(), rescheduleId, keep, note);
  return toResult(error, "Nem sikerült menteni.");
}

/** A vendég válasza a javaslatra */
export async function respondReschedule(rescheduleId: string, accept: boolean): Promise<Result> {
  const { error } = await q.respondReschedule(await createClient(), rescheduleId, accept);
  return toResult(error, "Nem sikerült elküldeni a válaszod.");
}
