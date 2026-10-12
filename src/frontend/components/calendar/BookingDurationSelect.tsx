"use client";

import { useState, useTransition } from "react";
import { setBookingDurationAction } from "@/backend/calendar/calendar.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Select } from "@/frontend/components/ui/Select";
import { toBucharestTime } from "@/shared/datetime/datetime";
import type { FormState } from "@/shared/types/form";

type BookingDurationSelectProps = {
  bookingId: string;
  startsAt: string;
  endsAt: string;
  /** Sikeres módosítás után (a naptár frissül, az ablak bezárul) */
  onDone: (state: FormState) => void;
};

/** 5 perctől 4 óráig, 5 perces lépésekben */
const OPTIONS = Array.from({ length: 48 }, (_, i) => (i + 1) * 5);

function label(minutes: number, startsAt: string): string {
  const end = toBucharestTime(new Date(new Date(startsAt).getTime() + minutes * 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const length = h ? `${h} óra${m ? ` ${m} perc` : ""}` : `${m} perc`;
  return `${length} (vége ${end})`;
}

/**
 * A foglalás időtartama – rövidebbre / hosszabbra vehető (pl. nem kell mindenkinek a teljes 30 perc).
 * A kezdés marad; ha ütközne a következő foglalással, nem engedi. (Asztali gépen a foglalás vége húzható is.)
 */
export function BookingDurationSelect({ bookingId, startsAt, endsAt, onDone }: BookingDurationSelectProps) {
  const current = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000);
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const options = OPTIONS.includes(current) ? OPTIONS : [...OPTIONS, current].sort((a, b) => a - b);

  function change(minutes: number) {
    setValue(minutes);
    setError(null);
    startTransition(async () => {
      const result = await setBookingDurationAction(bookingId, minutes);
      if (result.error) {
        setValue(current);
        setError(result.error);
      } else {
        onDone(result);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Select
        label="Időtartam"
        name="durationMin"
        value={String(value)}
        disabled={busy}
        onChange={(e) => change(Number(e.target.value))}
        options={options.map((m) => ({ value: String(m), label: label(m, startsAt) }))}
        hint="A kezdés marad. Ha valakinek kevesebb idő kell, itt rövidítheted – a felszabaduló idő foglalható lesz."
      />
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
