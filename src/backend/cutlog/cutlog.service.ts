import "server-only";
import { randomUUID } from "node:crypto";
import { processPhotoFile } from "@/backend/core/avatar";
import { dbErrorMessage } from "@/backend/core/errors";
import { createClient, type DbClient } from "@/backend/core/server-client";
import { CUT_NOTE_MAX, type CutEntry, type CutLog } from "@/shared/types/cutlog";
import * as q from "./cutlog.queries";

// =============================================================================
// Vágásnapló (dontesek.md 32.): a barber a lezajlott foglaláshoz fotót és jegyzetet ment; legközelebb a
// foglalásnál látja, mit csinált legutóbb – és a vendég is látja a „Foglalásaim” oldalon.
// =============================================================================

/** Ennyi ideig érvényes a fotó linkje (utána újratöltéskor újat kap) */
const LINK_SECONDS = 60 * 60;
const HISTORY_LIMIT = 6;

type Row = {
  booking_id: string;
  note: string | null;
  photo_path: string | null;
  booking: { starts_at: string; service: { name: string } | null } | null;
};

/** Sorok → bejegyzések, a fotókhoz lejáró linkkel; legújabb elöl */
async function toEntries(db: DbClient, rows: Row[]): Promise<CutEntry[]> {
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data } = await q.signPhotos(db, paths, LINK_SECONDS);
    for (const s of data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows
    .map((r) => ({
      bookingId: r.booking_id,
      startsAt: r.booking?.starts_at ?? "",
      serviceName: r.booking?.service?.name ?? "",
      note: r.note,
      photoUrl: r.photo_path ? (urls.get(r.photo_path) ?? null) : null,
    }))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

/** Egy foglalás naplója a barbernek: a mostani bejegyzés és a vendég korábbi vágásai */
export async function getCutLog(barberId: string, bookingId: string): Promise<CutLog | null> {
  const db = await createClient();
  const { data: booking } = await q.selectBooking(db, bookingId);
  if (!booking || booking.barber_id !== barberId) return null;

  // Fiókos vendégnél az összes vágása ennél a barbernél; kézi (fiók nélküli) foglalásnál csak ez az egy
  const { data } = booking.customer_id
    ? await q.selectEntriesOfCustomer(db, barberId, booking.customer_id)
    : await q.selectEntriesOfBookings(db, [bookingId]);
  const entries = await toEntries(db, (data ?? []) as unknown as Row[]);

  return {
    canEdit: booking.status === "confirmed" && new Date(booking.starts_at).getTime() <= Date.now(),
    current: entries.find((e) => e.bookingId === bookingId) ?? null,
    history: entries.filter((e) => e.bookingId !== bookingId && e.startsAt < booking.starts_at).slice(0, HISTORY_LIMIT),
  };
}

/** A vendég saját foglalásainak naplója (foglalás azonosító → bejegyzés) */
export async function getCutEntriesForBookings(bookingIds: string[]): Promise<Map<string, CutEntry>> {
  if (!bookingIds.length) return new Map();
  const db = await createClient();
  const { data } = await q.selectEntriesOfBookings(db, bookingIds);
  const entries = await toEntries(db, (data ?? []) as unknown as Row[]);
  return new Map(entries.map((e) => [e.bookingId, e]));
}

type Result = { ok: true } | { ok: false; error: string };

/**
 * Napló mentése: jegyzet és (új / megtartott / törölt) fotó. Ha mindkettő üres, a bejegyzés törlődik.
 * Hiba esetén a frissen feltöltött fotó törlődik; sikeres csere után a régi.
 */
export async function saveCutNote(
  barberId: string,
  bookingId: string,
  input: { note: string; photo: File | null; removePhoto: boolean },
): Promise<Result> {
  const note = input.note.trim() || null;
  if (note && note.length > CUT_NOTE_MAX) return { ok: false, error: `A jegyzet legfeljebb ${CUT_NOTE_MAX} karakter lehet.` };

  const db = await createClient();
  const { data: existing } = await q.selectNote(db, bookingId);
  const oldPath = existing?.photo_path ?? null;

  let newPath: string | null = null;
  if (input.photo) {
    const processed = await processPhotoFile(input.photo);
    if (!processed.ok) return processed;
    newPath = `${barberId}/${bookingId}/${randomUUID()}.webp`;
    const { error } = await q.uploadPhoto(db, newPath, processed.bytes);
    if (error) return { ok: false, error: "Nem sikerült feltölteni a fotót. Csak a már lezajlott foglaláshoz menthetsz." };
  }

  const photoPath = newPath ?? (input.removePhoto ? null : oldPath);
  let error;
  if (!note && !photoPath) {
    ({ error } = existing ? await q.deleteNote(db, bookingId) : { error: null });
  } else if (existing) {
    ({ error } = await q.updateNote(db, bookingId, { note, photo_path: photoPath }));
  } else {
    ({ error } = await q.insertNote(db, { booking_id: bookingId, barber_id: barberId, note, photo_path: photoPath }));
  }

  if (error) {
    if (newPath) await q.removePhotos(db, [newPath]);
    return { ok: false, error: dbErrorMessage(error, "Nem sikerült menteni. Csak a már lezajlott foglaláshoz menthetsz.") };
  }
  if (oldPath && oldPath !== photoPath) await q.removePhotos(db, [oldPath]);
  return { ok: true };
}

/** Fióktörléshez: a felhasználó (barberként feltöltött / vendégként róla készült) vágásfotói */
export const listPhotoPathsForAccount = q.selectPhotoPathsForAccount;
export const removePhotosAsAdmin = q.removePhotos;
