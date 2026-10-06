"use client";

import { useRouter } from "next/navigation";
import { useBookingChanges } from "@/frontend/lib/useBookingChanges";

/** Láthatatlan komponens: foglalásváltozáskor újratölti az oldal adatait (pl. /keresek, /foglalasaim). */
export function LiveRefresh({ filter }: { filter: string }) {
  const router = useRouter();
  useBookingChanges(filter, () => router.refresh());
  return null;
}
