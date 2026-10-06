"use client";

import { useRouter } from "next/navigation";
import { type RealtimeTable, useBookingChanges } from "@/frontend/lib/useBookingChanges";

/**
 * Láthatatlan komponens: változáskor újratölti az oldal adatait (pl. /keresek, /foglalasaim, a harang).
 * Alapból a foglalásokat és az áthelyezési javaslatokat figyeli.
 */
export function LiveRefresh({ filter, tables }: { filter: string; tables?: readonly RealtimeTable[] }) {
  const router = useRouter();
  useBookingChanges(filter, () => router.refresh(), tables);
  return null;
}
