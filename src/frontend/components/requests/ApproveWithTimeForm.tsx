"use client";

import { useActionState, useState } from "react";
import { approveWithTimeAction } from "@/backend/requests/requests.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { TextField } from "@/frontend/components/ui/TextField";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import { useSubmitWithoutReset } from "@/frontend/lib/useSubmitWithoutReset";
import { lengthLabel, toMinutes } from "@/shared/datetime/clock";
import { toBucharestDate, toBucharestTime } from "@/shared/datetime/datetime";
import type { FormState } from "@/shared/types/form";

type ApproveWithTimeFormProps = {
  bookingId: string;
  /** A kért időpont */
  startsAt: string;
  endsAt: string;
  onDone?: (state: FormState) => void;
  onCancel: () => void;
};

/**
 * Jóváhagyás módosított idővel. Ha csak a befejezés változik (rövidebb / hosszabb), azonnal megerősítve;
 * ha a nap vagy a kezdés is, a vendég javaslatot kap, és neki kell elfogadnia (addig a kérés függő marad).
 */
export function ApproveWithTimeForm({ bookingId, startsAt, endsAt, onDone, onCancel }: ApproveWithTimeFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(approveWithTimeAction, {});
  const onSubmit = useSubmitWithoutReset(action);
  useOnActionResult(state, (result) => onDone?.(result), true);

  const original = { date: toBucharestDate(startsAt), time: toBucharestTime(startsAt) };
  const [date, setDate] = useState(state.values?.date ?? original.date);
  const [time, setTime] = useState(state.values?.time ?? original.time);
  const [end, setEnd] = useState(state.values?.endTime ?? toBucharestTime(endsAt));

  const startMin = toMinutes(time);
  const endMin = toMinutes(end);
  const length = startMin !== null && endMin !== null && endMin > startMin ? endMin - startMin : null;
  const startChanged = date !== original.date || time !== original.time;

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-line px-4 py-4" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && !onDone && <Alert tone="success">{state.success}</Alert>}

      <TextField label="Nap" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={state.fieldErrors?.date} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Kezdés"
          name="time"
          type="time"
          step={300}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          error={state.fieldErrors?.time}
        />
        <TextField
          label="Befejezés"
          name="endTime"
          type="time"
          step={60}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          error={state.fieldErrors?.endTime}
        />
      </div>
      {length !== null && <p className="-mt-2 text-sm text-muted">Időtartam: {lengthLabel(length)}</p>}

      {startChanged ? (
        <Alert tone="info">
          A kezdés változik ({original.date === date ? original.time : `${original.date} ${original.time}`} helyett) – a
          vendég értesítést kap, és <strong>neki kell elfogadnia</strong>. Ha nemet mond vagy nem válaszol, a kérés
          visszakerül hozzád az eredeti időponttal.
        </Alert>
      ) : (
        <p className="text-sm text-muted">Csak a befejezés változik – a foglalás azonnal megerősítve, a vendégnek nem kell újra döntenie.</p>
      )}

      {startChanged && (
        <TextArea
          label="Üzenet a vendégnek (nem kötelező)"
          name="note"
          rows={2}
          maxLength={500}
          defaultValue={state.values?.note}
          error={state.fieldErrors?.note}
          placeholder="Pl. „10:00-ra már foglalt vagyok, 10:30 jó lenne?”"
        />
      )}

      <div className="flex gap-2">
        <SubmitButton forcePending={pending} pendingText="Mentés…">
          {startChanged ? "Javaslat küldése" : "Jóváhagyás"}
        </SubmitButton>
        <Button variant="ghost" onClick={onCancel}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
