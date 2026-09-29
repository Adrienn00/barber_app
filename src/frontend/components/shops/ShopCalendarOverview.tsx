"use client";

import type { DatesSetArg, EventInput } from "@fullcalendar/core";
import huLocale from "@fullcalendar/core/locales/hu";
import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMemo, useState, useSyncExternalStore } from "react";
import { loadShopCalendarAction } from "@/backend/shops/shops.actions";
import type { ShopCalendarEntry } from "@/backend/shops/shops.service";
import { Card } from "@/frontend/components/ui/Card";
import { floatingToUtcIso, toBucharestLocal } from "@/shared/datetime/datetime";

const noopSubscribe = () => () => {};
const MOBILE_QUERY = "(max-width: 767px)";
const isMobileScreen = () => window.matchMedia(MOBILE_QUERY).matches;

/**
 * A vezető csak olvasható áttekintése a csapat naptáráról (docs/dontesek.md 15.).
 * Foglalás: „Barber: vendég · szolgáltatás”; magánprogram: csak „Barber: foglalt” (tartalom nélkül).
 */
export function ShopCalendarOverview() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  // Telefonon napi nézet (heti nézetben 7 oszlop nem fér ki olvashatóan)
  const isMobile = useSyncExternalStore(noopSubscribe, isMobileScreen, () => false);
  const [entries, setEntries] = useState<ShopCalendarEntry[]>([]);

  const events = useMemo<EventInput[]>(
    () =>
      entries.map((e, i) => ({
        id: String(i),
        title:
          e.kind === "busy"
            ? `${e.barberName}: foglalt`
            : `${e.barberName}: ${e.customerName ?? ""} · ${e.serviceName ?? ""}`,
        start: e.startLocal,
        end: e.endLocal,
        classNames: [
          "ct-event",
          e.kind === "busy" ? "ct-event-private" : e.status === "pending" ? "ct-event-pending" : "ct-event-confirmed",
        ],
      })),
    [entries],
  );

  async function handleDatesSet(arg: DatesSetArg) {
    setEntries(await loadShopCalendarAction(floatingToUtcIso(arg.start), floatingToUtcIso(arg.end)));
  }

  return (
    <Card title="A csapat naptára">
      <p className="text-sm text-muted">
        Csak áttekintés: a foglalásokat mindenki a saját naptárában kezeli. A magánprogramok tartalmát nem látod, csak hogy az
        idő foglalt.
      </p>
      {mounted ? (
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin]}
          locale={huLocale}
          timeZone="UTC"
          now={() => toBucharestLocal(new Date())}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "today" }
              : { left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek" }
          }
          footerToolbar={isMobile ? { center: "timeGridDay,timeGridWeek" } : undefined}
          firstDay={1}
          slotDuration="00:15:00"
          slotLabelInterval="01:00"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          scrollTime="08:00:00"
          contentHeight={560}
          nowIndicator
          allDaySlot={false}
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          displayEventEnd={false}
          eventMinHeight={30}
          eventShortHeight={40}
          slotEventOverlap={false}
          events={events}
          eventDidMount={(arg) => {
            arg.el.title = arg.event.title;
          }}
          datesSet={handleDatesSet}
        />
      ) : (
        <div className="h-[560px] animate-pulse rounded-lg bg-background" />
      )}
    </Card>
  );
}
