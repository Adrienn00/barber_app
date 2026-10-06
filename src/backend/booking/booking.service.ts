import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import { toBucharestTime } from "@/shared/datetime/datetime";
import type { Slot } from "@/shared/types/directory";
import type { BookingStatus } from "@/shared/types/domain";
import { formatPhone } from "@/shared/validation/phone";
import * as q from "./booking.queries";

// =============================================================================
// Vendég foglalás: szabad időpontok, foglalási kérés, „Foglalásaim”
// =============================================================================

export async function getSlots(barberId: string, serviceId: string, date: string): Promise<Slot[]> {
  const { data } = await q.selectAvailableSlots(await createClient(), barberId, serviceId, date);
  return (data ?? []).map((s) => ({ startsAt: s.starts_at, time: toBucharestTime(s.starts_at) }));
}

export async function requestBooking(
  serviceId: string,
  startsAt: string,
  note: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await q.requestBooking(await createClient(), serviceId, startsAt, note);
  if (error || !data) {
    // A függvény saját üzenetei magyarok (foglalt időpont, hiányos profil stb.)
    const own = error && ["22023", "42501"].includes(error.code ?? "") ? error.message : null;
    return { ok: false, error: own ?? dbErrorMessage(error, "Nem sikerült elküldeni a kérést.") };
  }
  return { ok: true, id: data };
}

export type MyBooking = {
  id: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  expiresAt: string | null;
  note: string | null;
  decisionNote: string | null;
  cancelledBy: "customer" | "barber" | null;
  serviceName: string;
  price: number;
  barberName: string;
  barberSlug: string;
  address: string;
  phone: string;
  cancelLimitHours: number;
};

export type MyBookingGroups = { upcoming: MyBooking[]; past: MyBooking[]; closed: MyBooking[] };

/**
 * A vendég foglalásai három csoportban:
 * közelgő (függő + megerősített, jövőbeli), múltbeli (lezajlott), lezárt (elutasított, lejárt, lemondott).
 */
export async function getMyBookings(): Promise<MyBookingGroups> {
  const { data } = await q.selectMyBookings(await createClient());
  const now = Date.now();
  const all: MyBooking[] = (data ?? []).map((b) => ({
    id: b.id,
    status: b.status,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    expiresAt: b.expires_at,
    note: b.customer_note,
    decisionNote: b.decision_note,
    cancelledBy: b.cancelled_by,
    serviceName: b.service_name,
    price: Number(b.price),
    barberName: b.barber_name,
    barberSlug: b.barber_slug,
    address: `${b.barber_city}, ${b.barber_address}`,
    phone: formatPhone(b.barber_phone),
    cancelLimitHours: b.cancel_limit_hours,
  }));

  const active = (b: MyBooking) => b.status === "pending" || b.status === "confirmed";
  return {
    // A közelgők időrendben (a legközelebbi elöl)
    upcoming: all.filter((b) => active(b) && new Date(b.endsAt).getTime() > now).reverse(),
    past: all.filter((b) => b.status === "confirmed" && new Date(b.endsAt).getTime() <= now),
    closed: all.filter((b) => !active(b)),
  };
}
