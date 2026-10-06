"use client";

import { useEffect, useRef } from "react";
import { createClient } from "./supabase-browser";

export type RealtimeTable = "bookings" | "booking_reschedules" | "notifications";
const BOOKING_TABLES: readonly RealtimeTable[] = ["bookings", "booking_reschedules"];

/**
 * Élő frissítés: ha egy foglalás vagy áthelyezési javaslat megváltozik (új kérés, jóváhagyás, lemondás,
 * lejárat, javaslat, válasz), meghívja a callbacket. A két táblában ugyanazok a szűrhető oszlopok vannak.
 * A szűrő pl. `barber_id=eq.<id>` vagy `customer_id=eq.<id>`; az RLS miatt úgyis csak a saját sorok jönnek.
 * A figyelt táblák cserélhetők (pl. ["notifications"] és `user_id=eq.<id>` a harang számjelzőjéhez).
 */
export function useBookingChanges(filter: string, onChange: () => void, tables: readonly RealtimeTable[] = BOOKING_TABLES) {
  const callbackRef = useRef(onChange);
  useEffect(() => {
    callbackRef.current = onChange;
  });

  useEffect(() => {
    const supabase = createClient();
    // Rövid várakozás: egy döntés több sort is érinthet, ne frissítsünk mindegyikre külön
    let timer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let closed = false;

    // A csatorna a bejelentkezett felhasználó nevében csatlakozzon (különben az RLS miatt nem jön semmi)
    void supabase.auth.getSession().then(async ({ data }) => {
      if (closed || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (closed) return;
      const notify = () => {
        clearTimeout(timer);
        timer = setTimeout(() => callbackRef.current(), 300);
      };
      // Egyedi név: ugyanarra a szűrőre több komponens is figyelhet (fejléc + naptár)
      const created = supabase.channel(`${tables.join("+")}:${filter}:${crypto.randomUUID()}`);
      for (const table of tables) {
        created.on("postgres_changes", { event: "*", schema: "public", table, filter }, notify);
      }
      channel = created.subscribe();
    });

    return () => {
      closed = true;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
    // A táblák listája a hívó helyén állandó (szövegként hasonlítjuk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, tables.join(",")]);
}
