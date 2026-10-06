"use client";

import { useEffect, useRef } from "react";
import { createClient } from "./supabase-browser";

/**
 * Élő frissítés: ha egy foglalás megváltozik (új kérés, jóváhagyás, lemondás, lejárat), meghívja a callbacket.
 * A szűrő pl. `barber_id=eq.<id>` vagy `customer_id=eq.<id>`; az RLS miatt úgyis csak a saját sorok jönnek.
 */
export function useBookingChanges(filter: string, onChange: () => void) {
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
      channel = supabase
        // Egyedi név: ugyanarra a szűrőre több komponens is figyelhet (fejléc + naptár)
        .channel(`bookings:${filter}:${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter }, () => {
          clearTimeout(timer);
          timer = setTimeout(() => callbackRef.current(), 300);
        })
        .subscribe();
    });

    return () => {
      closed = true;
      clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [filter]);
}
