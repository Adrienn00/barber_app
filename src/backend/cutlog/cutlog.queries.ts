import "server-only";
import type { DbClient } from "@/backend/core/server-client";

// =============================================================================
// Vágásnapló – Supabase-hívások. A jogosultság az RLS-ben van (20261015090000_cut_log.sql):
// a barber csak a saját lezajlott foglalásaihoz ír, a vendég csak a sajátjait látja.
// =============================================================================

const BUCKET = "cuts";

/** Egy foglalás (a barber naptárából): kié, mikor, milyen állapotban */
export function selectBooking(db: DbClient, bookingId: string) {
  return db.from("bookings").select("id, barber_id, customer_id, status, starts_at").eq("id", bookingId).maybeSingle();
}

/** Naplóbejegyzések foglalásonként, a foglalás idejével és szolgáltatásával */
const ENTRY_COLUMNS = "booking_id, note, photo_path, booking:bookings!inner(starts_at, customer_id, service:services(name))";

/** Egy vendég összes naplóbejegyzése ennél a barbernél */
export function selectEntriesOfCustomer(db: DbClient, barberId: string, customerId: string) {
  return db.from("cut_notes").select(ENTRY_COLUMNS).eq("barber_id", barberId).eq("booking.customer_id", customerId);
}

/** Megadott foglalások naplóbejegyzései (amit az RLS enged) */
export function selectEntriesOfBookings(db: DbClient, bookingIds: string[]) {
  return db.from("cut_notes").select(ENTRY_COLUMNS).in("booking_id", bookingIds);
}

export function selectNote(db: DbClient, bookingId: string) {
  return db.from("cut_notes").select("note, photo_path").eq("booking_id", bookingId).maybeSingle();
}

export function insertNote(db: DbClient, row: { booking_id: string; barber_id: string; note: string | null; photo_path: string | null }) {
  return db.from("cut_notes").insert(row);
}

export function updateNote(db: DbClient, bookingId: string, fields: { note: string | null; photo_path: string | null }) {
  return db.from("cut_notes").update(fields).eq("booking_id", bookingId);
}

export function deleteNote(db: DbClient, bookingId: string) {
  return db.from("cut_notes").delete().eq("booking_id", bookingId);
}

export function uploadPhoto(db: DbClient, path: string, bytes: Buffer) {
  return db.storage.from(BUCKET).upload(path, bytes, { contentType: "image/webp", cacheControl: "31536000" });
}

export function removePhotos(db: DbClient, paths: string[]) {
  return db.storage.from(BUCKET).remove(paths);
}

/** Lejáró linkek a privát fotókhoz */
export function signPhotos(db: DbClient, paths: string[], seconds: number) {
  return db.storage.from(BUCKET).createSignedUrls(paths, seconds);
}

// --- Csak a teljes jogú (admin) klienssel: fióktörléshez ------------------------

/** A barber által feltöltött, illetve a vendégről készült fotók */
export async function selectPhotoPathsForAccount(admin: DbClient, userId: string, barberId: string | null) {
  const [asCustomer, asBarber] = await Promise.all([
    admin.from("cut_notes").select("photo_path, booking:bookings!inner(customer_id)").eq("booking.customer_id", userId),
    barberId ? admin.from("cut_notes").select("photo_path").eq("barber_id", barberId) : Promise.resolve({ data: [] }),
  ]);
  return [...(asCustomer.data ?? []), ...(asBarber.data ?? [])]
    .map((n) => n.photo_path)
    .filter((p): p is string => Boolean(p));
}
