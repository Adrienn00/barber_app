"use client";

import { useState, useTransition } from "react";
import { setBookingDurationAction } from "@/backend/calendar/calendar.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { TextField } from "@/frontend/components/ui/TextField";
import { lengthLabel, toMinutes } from "@/shared/datetime/clock";
import { toBucharestTime } from "@/shared/datetime/datetime";
import type { FormState } from "@/shared/types/form";

type BookingEndTimeProps = {
  bookingId: string;
  startsAt: string;
  endsAt: string;
  /** Sikeres módosítás után (a naptár frissül, az ablak bezárul) */
  onDone: (state: FormState) => void;
};

/**
 * A foglalás befejezése – a barber beírja, meddig tart (pl. 15:20 a 15:30 helyett). A kezdés marad;
 * ha ütközne a következő foglalással, nem engedi. (A naptárban a foglalás alja húzható is.)
 */
export function BookingEndTime({ bookingId, startsAt, endsAt, onDone }: BookingEndTimeProps) {
  const startTime = toBucharestTime(startsAt);
  const [end, setEnd] = useState(toBucharestTime(endsAt));
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const startMin = toMinutes(startTime)!;
  const endMin = toMinutes(end);
  // Éjfélen átnyúló foglalás nincs – a befejezés ugyanazon a napon, a kezdés után van
  const minutes = endMin === null ? null : endMin - startMin;
  const valid = minutes !== null && minutes >= 5 && minutes <= 480;
  const unchanged = end === toBucharestTime(endsAt);

  function save() {
    if (!valid || minutes === null) return;
    setError(null);
    startTransition(async () => {
      const result = await setBookingDurationAction(bookingId, minutes);
      if (result.error) setError(result.error);
      else onDone(result);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <TextField
            label={`Befejezés (kezdés: ${startTime})`}
            name="endTime"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            error={minutes !== null && !valid ? "A befejezés legalább 5 perccel a kezdés után legyen (legfeljebb 8 óra)." : undefined}
            hint={valid && minutes !== null ? `Időtartam: ${lengthLabel(minutes)}` : undefined}
          />
        </div>
        <Button onClick={save} disabled={busy || !valid || unchanged} className="mb-6">
          {busy ? "Mentés…" : "Mentés"}
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
