"use client";

import type { DateSelectArg, DatesSetArg, EventChangeArg, EventClickArg } from "@fullcalendar/core";
import huLocale from "@fullcalendar/core/locales/hu";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  loadCalendarAction,
  loadPrivateEventAction,
  movePrivateEventAction,
} from "@/backend/calendar/calendar.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { Dialog } from "@/frontend/components/ui/Dialog";
import { type CalendarItem, toBusinessHours, toEventInputs } from "@/frontend/lib/calendarEvents";
import { floatingToLocal, floatingToUtcIso, toBucharestLocal } from "@/shared/datetime/datetime";
import type { CalendarData, CustomerOption, ServiceOption } from "@/shared/types/calendar";
import type { FormState } from "@/shared/types/form";
import type { PrivateEventInput } from "@/shared/validation/calendar";
import { BookingDetails } from "./BookingDetails";
import { CalendarLegend } from "./CalendarLegend";
import { NewEntryPanel } from "./NewEntryPanel";
import { PrivateEventDetails } from "./PrivateEventDetails";
import { PrivateEventForm } from "./PrivateEventForm";
import { QuickBreakBar } from "./QuickBreakBar";

type BarberCalendarProps = {
  services: ServiceOption[];
  customers: CustomerOption[];
};

type Slot = { date: string; startTime: string; endTime: string; allDay: boolean };

type DialogState =
  | { type: "new"; slot: Slot }
  | { type: "details"; item: CalendarItem }
  | { type: "edit"; initial: PrivateEventInput & { id: string } }
  | null;

type Notice = Pick<FormState, "success" | "warning" | "error">;

const EMPTY: CalendarData = { bookings: [], privateEvents: [], workingHours: [] };

// A naptár csak a böngészőben jelenik meg, és a képernyőmérethez igazítja a nézetet
const MOBILE_QUERY = "(max-width: 767px)";
const noopSubscribe = () => () => {};
const isMobileScreen = () => window.matchMedia(MOBILE_QUERY).matches;
function subscribeToMobile(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * A barber naptára (Google Naptár-szerű): nap / hét / hónap nézet, színkódolt foglalások és
 * magánprogramok, gyors szünet, kijelöléssel új program vagy kézi foglalás, húzással áthelyezés.
 */
export function BarberCalendar({ services, customers }: BarberCalendarProps) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isMobile = useSyncExternalStore(subscribeToMobile, isMobileScreen, () => false);
  const [data, setData] = useState<CalendarData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const range = useRef<{ from: string; to: string } | null>(null);

  const reload = useCallback(async () => {
    if (!range.current) return;
    setLoading(true);
    try {
      setData(await loadCalendarAction(range.current.from, range.current.to));
    } finally {
      setLoading(false);
    }
  }, []);

  const events = useMemo(() => toEventInputs(data), [data]);
  const businessHours = useMemo(() => toBusinessHours(data.workingHours), [data.workingHours]);

  /** Mentés / törlés / szünet után: üzenet, ablak bezárása, naptár frissítése */
  const handleDone = useCallback(
    (state: FormState) => {
      setNotice({ success: state.success, warning: state.warning, error: state.error });
      if (state.success) setDialog(null);
      void reload();
    },
    [reload],
  );

  function handleDatesSet(arg: DatesSetArg) {
    range.current = { from: floatingToUtcIso(arg.start), to: floatingToUtcIso(arg.end) };
    void reload();
  }

  function handleSelect(arg: DateSelectArg) {
    const start = floatingToLocal(arg.start);
    const end = floatingToLocal(arg.end);
    setDialog({
      type: "new",
      slot: {
        date: start.slice(0, 10),
        startTime: arg.allDay ? "" : start.slice(11, 16),
        endTime: arg.allDay || end.slice(0, 10) !== start.slice(0, 10) ? "" : end.slice(11, 16),
        allDay: arg.allDay,
      },
    });
    arg.view.calendar.unselect();
  }

  function handleEventClick(arg: EventClickArg) {
    setDialog({ type: "details", item: arg.event.extendedProps.item as CalendarItem });
  }

  async function handleEventChange(arg: EventChangeArg) {
    const item = arg.event.extendedProps.item as CalendarItem;
    const { start, end } = arg.event;
    if (item.kind !== "private" || !start) return arg.revert();
    const fallbackEnd = new Date(start.getTime() + (arg.event.allDay ? 86_400_000 : 30 * 60_000));
    const result = await movePrivateEventAction(item.eventId, floatingToUtcIso(start), floatingToUtcIso(end ?? fallbackEnd));
    if (result.error) arg.revert();
    handleDone(result);
  }

  async function openEditor(eventId: string) {
    const initial = await loadPrivateEventAction(eventId);
    if (initial) setDialog({ type: "edit", initial });
    else setNotice({ error: "A program nem található." });
  }

  /** „+ Új” gomb: a következő 15 perces időponttól */
  function openNewNow() {
    const now = toBucharestLocal(new Date());
    const minutes = Math.ceil(Number(now.slice(14, 16)) / 15) * 15;
    const hour = Number(now.slice(11, 13)) + Math.floor(minutes / 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    const startTime = `${pad(hour % 24)}:${pad(minutes % 60)}`;
    const endTime = `${pad((hour + 1) % 24)}:${pad(minutes % 60)}`;
    setDialog({ type: "new", slot: { date: now.slice(0, 10), startTime, endTime, allDay: false } });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <QuickBreakBar onDone={handleDone} />
        <Button onClick={openNewNow}>+ Új bejegyzés</Button>
      </div>

      {notice?.error && <Alert tone="error">{notice.error}</Alert>}
      {notice?.success && !notice.warning && <Alert tone="success">{notice.success}</Alert>}
      {notice?.warning && <Alert tone="info">{notice.warning}</Alert>}

      <div className={`rounded-xl border border-line bg-surface p-2 sm:p-4 ${loading ? "opacity-70" : ""}`}>
        {mounted ? (
          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            locale={huLocale}
            // „Lebegő” idő: a bukaresti helyi időt mutatja, bárhol is van a néző
            timeZone="UTC"
            now={() => toBucharestLocal(new Date())}
            initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
            headerToolbar={
              isMobile
                ? { left: "prev,next", center: "title", right: "today" }
                : { left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth" }
            }
            footerToolbar={isMobile ? { center: "timeGridDay,timeGridWeek,dayGridMonth" } : undefined}
            firstDay={1}
            slotDuration="00:15:00"
            snapDuration="00:05:00"
            slotLabelInterval="01:00"
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            scrollTime="08:00:00"
            contentHeight={isMobile ? 560 : 680}
            nowIndicator
            // Rövid (10–15 perces) bejegyzés is olvasható magasságú legyen; az ütközők egymás mellé kerüljenek
            eventMinHeight={30}
            eventShortHeight={40}
            slotEventOverlap={false}
            allDayText="Egész nap"
            slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
            // Csak a kezdés látszik („08:45 Orvos”) – a hosszt a blokk mutatja; így a rövid bejegyzés is kifér
            displayEventEnd={false}
            // Egér fölé víve a teljes szöveg buborékban
            eventDidMount={(arg) => {
              arg.el.title = arg.event.title;
            }}
            businessHours={businessHours}
            events={events}
            selectable
            selectMirror
            editable
            eventDurationEditable
            selectLongPressDelay={250}
            eventLongPressDelay={300}
            dayMaxEvents
            datesSet={handleDatesSet}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventChange}
            eventResize={handleEventChange}
          />
        ) : (
          <div className="h-[560px] animate-pulse rounded-lg bg-background" />
        )}
      </div>

      <CalendarLegend />
      <p className="text-sm text-muted">
        Tipp: húzd végig az ujjad vagy az egeret egy üres sávon, és beírhatsz bármilyen hosszú programot (akár 10 percet is).
        A programokat áthúzhatod vagy a szélüknél nyújthatod.
      </p>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={
          dialog?.type === "new"
            ? "Új bejegyzés"
            : dialog?.type === "edit"
              ? "Program szerkesztése"
              : dialog?.type === "details" && dialog.item.kind === "private"
                ? dialog.item.title
                : "Foglalás"
        }
      >
        {dialog?.type === "new" && (
          <NewEntryPanel slot={dialog.slot} services={services} customers={customers} onSaved={handleDone} />
        )}
        {dialog?.type === "edit" && <PrivateEventForm initial={dialog.initial} onSaved={handleDone} />}
        {dialog?.type === "details" && dialog.item.kind === "booking" && <BookingDetails booking={dialog.item} />}
        {dialog?.type === "details" && dialog.item.kind === "private" && (
          <PrivateEventDetails
            event={dialog.item}
            onEdit={() => openEditor((dialog.item as { eventId: string }).eventId)}
            onChanged={handleDone}
          />
        )}
      </Dialog>
    </div>
  );
}
