"use client";

import { useActionState, useState } from "react";
import { rescheduleAction } from "@/backend/requests/requests.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Button } from "@/frontend/components/ui/Button";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { TextField } from "@/frontend/components/ui/TextField";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import { useSubmitWithoutReset } from "@/frontend/lib/useSubmitWithoutReset";
import { bucharestToUtc, formatDateTimeHu } from "@/shared/datetime/datetime";
import type { FormState } from "@/shared/types/form";
import type { RescheduleMode } from "@/shared/validation/calendar";

type RescheduleFormProps = {
  bookingId: string;
  /** A foglalás jelenlegi kezdése (UTC) */
  currentStartsAt: string;
  customerName: string;
  /** Fiók nélküli (kézi) vendég: nincs kitől kérdezni, csak közvetlen áthelyezés */
  isGuest: boolean;
  /** Előre kitöltött új nap / idő (pl. a naptárban áthúzott helyről) */
  initialDate: string;
  initialTime: string;
  onDone: (state: FormState) => void;
  onCancel: () => void;
};

const MODES: { value: RescheduleMode; title: string; text: string }[] = [
  {
    value: "propose",
    title: "Megkérdezem a vendéget",
    text: "A vendég elfogadhatja vagy elutasíthatja. Addig az új időpont foglalt, és a régi is megmarad.",
  },
  {
    value: "move",
    title: "Már megbeszéltük – áthelyezem",
    text: "Azonnal átkerül, a vendég nem kap kérdést. A foglalásainál látja: „Áthelyezve”.",
  },
];

/**
 * Foglalás áthelyezése új időpontra – kétféleképpen: javaslatként (a vendég dönt), vagy
 * közvetlenül (pl. telefonon már megbeszélték), ez utóbbi egy „Biztos?” lépés után.
 */
export function RescheduleForm({
  bookingId,
  currentStartsAt,
  customerName,
  isGuest,
  initialDate,
  initialTime,
  onDone,
  onCancel,
}: RescheduleFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(rescheduleAction, {});
  const onSubmit = useSubmitWithoutReset(action);
  useOnActionResult(state, onDone, true);

  const [date, setDate] = useState(state.values?.date ?? initialDate);
  const [time, setTime] = useState(state.values?.time ?? initialTime);
  const [mode, setMode] = useState<RescheduleMode>(isGuest ? "move" : "propose");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  const complete = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time);
  const newLabel = complete ? formatDateTimeHu(bucharestToUtc(`${date}T${time}`)) : "";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="note" value={note} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      {confirming ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-background px-4 py-3">
            Biztosan áthelyezed {customerName} foglalását?
            <br />
            <span className="text-muted">{formatDateTimeHu(currentStartsAt)}</span> →{" "}
            <span className="font-semibold text-brass">{newLabel}</span>
          </p>
          <p className="text-sm text-muted">
            {isGuest
              ? "Fiók nélküli vendég – ha még nem tudja, szólj neki telefonon."
              : "A vendég nem kap kérdést, csak a foglalásainál látja, hogy áthelyezted."}
          </p>
          <div className="flex gap-2">
            <SubmitButton pendingText="Áthelyezés…" forcePending={pending}>
              Igen, áthelyezem
            </SubmitButton>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Vissza
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">Most: {formatDateTimeHu(currentStartsAt)}</p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Új nap"
              name="newDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={state.fieldErrors?.date}
            />
            <TextField
              label="Új kezdés"
              name="newTime"
              type="time"
              step={300}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              error={state.fieldErrors?.time}
            />
          </div>

          {isGuest ? (
            <p className="text-sm text-muted">Fiók nélküli vendég: nincs kitől kérdezni, ezért közvetlenül helyezed át.</p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm text-muted">Hogyan?</legend>
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    mode === m.value ? "border-brass bg-brass/10" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="modeChoice"
                    checked={mode === m.value}
                    onChange={() => setMode(m.value)}
                    className="mt-1 accent-[var(--color-brass)]"
                  />
                  <span>
                    <span className="block font-semibold">{m.title}</span>
                    <span className="block text-sm text-muted">{m.text}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <TextArea
            label="Üzenet a vendégnek (nem kötelező)"
            name="noteText"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={state.fieldErrors?.note}
          />

          <div className="flex gap-2">
            {mode === "propose" ? (
              <SubmitButton pendingText="Küldés…" forcePending={pending}>
                Javaslat küldése
              </SubmitButton>
            ) : (
              <Button fullWidth disabled={!complete} onClick={() => setConfirming(true)}>
                Áthelyezés…
              </Button>
            )}
            <Button variant="ghost" onClick={onCancel}>
              Mégse
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
