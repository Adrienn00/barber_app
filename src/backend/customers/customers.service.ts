import "server-only";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient } from "@/backend/core/server-client";
import { formatPhone } from "@/shared/validation/phone";
import * as q from "./customers.queries";

// =============================================================================
// A barber vendégei: látogatások száma, utolsó és következő időpont, megbízható jelölés.
// Megbízható vendég kérése azonnal megerősítésre kerül (spec 5.2).
// =============================================================================

export type MyCustomer = {
  id: string;
  name: string;
  phone: string | null;
  isTrusted: boolean;
  /** Lezajlott (megerősített) látogatások száma */
  visits: number;
  lastVisit: string | null;
  nextVisit: string | null;
};

export async function listMyCustomers(barberId: string): Promise<MyCustomer[]> {
  const db = await createClient();
  const [{ data: customers }, { data: bookings }] = await Promise.all([
    q.selectMyCustomers(db, barberId),
    q.selectConfirmedBookings(db, barberId),
  ]);

  const now = Date.now();
  const stats = new Map<string, { visits: number; lastVisit: string | null; nextVisit: string | null }>();
  for (const b of bookings ?? []) {
    const s = stats.get(b.customer_id!) ?? { visits: 0, lastVisit: null, nextVisit: null };
    if (new Date(b.starts_at).getTime() <= now) {
      s.visits++;
      if (!s.lastVisit || b.starts_at > s.lastVisit) s.lastVisit = b.starts_at;
    } else if (!s.nextVisit || b.starts_at < s.nextVisit) {
      s.nextVisit = b.starts_at;
    }
    stats.set(b.customer_id!, s);
  }

  return (customers ?? [])
    .map((c) => ({
      id: c.customer_id,
      name: c.customer?.full_name ?? "Névtelen",
      phone: c.customer?.phone ? formatPhone(c.customer.phone) : null,
      isTrusted: c.is_trusted,
      ...(stats.get(c.customer_id) ?? { visits: 0, lastVisit: null, nextVisit: null }),
    }))
    .sort((a, b) => Number(b.isTrusted) - Number(a.isTrusted) || a.name.localeCompare(b.name, "hu"));
}

export async function setCustomerTrusted(
  barberId: string,
  customerId: string,
  trusted: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await q.updateTrusted(await createClient(), barberId, customerId, trusted);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!data?.length) return { ok: false, error: "Ez a vendég még nem foglalt nálad." };
  return { ok: true };
}
