"use client";

import { useActionState, useState } from "react";
import { savePrivateEventAction } from "@/backend/calendar/calendar.actions";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import { Alert } from "@/frontend/components/ui/Alert";
import { Checkbox } from "@/frontend/components/ui/Checkbox";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { TextField } from "@/frontend/components/ui/TextField";
import { useSubmitWithoutReset } from "@/frontend/lib/useSubmitWithoutReset";
import type { FormState } from "@/shared/types/form";
import type { PrivateEventInput } from "@/shared/validation/calendar";

/** Gyakori programok egy koppintással */
const QUICK_TITLES = ["Szünet", "Ebéd", "Orvos", "Szabadnap", "Ügyintézés"];

type PrivateEventFormProps = {
  /** Kezdőértékek (új programnál a naptárban kijelölt idő) */
  initial: PrivateEventInput & { id?: string };
  onSaved: (state: FormState) => void;
};

/** Magánprogram / szünet felvétele vagy szerkesztése – akár 5 perces pontossággal. */
export function PrivateEventForm({ initial, onSaved }: PrivateEventFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePrivateEventAction, {});
  // Beküldés automatikus alaphelyzetbe állítás nélkül (élő mezők vannak az űrlapon)
  const onSubmit = useSubmitWithoutReset(action);
  useOnActionResult(state, onSaved, true);

  const values = { ...initial, ...state.values };
  const [title, setTitle] = useState(values.title);
  const [allDay, setAllDay] = useState(initial.allDay);
  const [repeatWeekly, setRepeatWeekly] = useState(initial.repeatWeekly);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {initial.id && <input type="hidden" name="eventId" value={initial.id} />}

      <div className="space-y-2">
        <TextField
          label="Mi ez?"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="pl. Szünet, Orvos"
          error={state.fieldErrors?.title}
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_TITLES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTitle(t);
                if (t === "Szabadnap") setAllDay(true);
              }}
              className={`rounded-full border px-3 py-1 text-sm ${
                title === t ? "border-brass text-brass" : "border-line text-muted hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <Checkbox name="allDay" label="Egész napos" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />

      <div className="grid grid-cols-2 gap-3">
        <TextField label={allDay ? "Első nap" : "Nap"} name="date" type="date" defaultValue={values.date} error={state.fieldErrors?.date} />
        {allDay ? (
          <TextField
            label="Utolsó nap (nem kötelező)"
            name="endDate"
            type="date"
            defaultValue={values.endDate}
            error={state.fieldErrors?.endDate}
          />
        ) : (
          <div />
        )}
        {!allDay && (
          <>
            <TextField
              label="Kezdés"
              name="startTime"
              type="time"
              step={300}
              defaultValue={values.startTime}
              error={state.fieldErrors?.startTime}
            />
            <TextField
              label="Befejezés"
              name="endTime"
              type="time"
              step={300}
              defaultValue={values.endTime}
              error={state.fieldErrors?.endTime}
            />
          </>
        )}
      </div>

      <Checkbox
        name="repeatWeekly"
        label="Minden héten ismétlődik"
        checked={repeatWeekly}
        onChange={(e) => setRepeatWeekly(e.target.checked)}
      />
      {repeatWeekly && (
        <TextField
          label="Ismétlődés vége (nem kötelező)"
          name="repeatUntil"
          type="date"
          defaultValue={values.repeatUntil}
          hint="Üresen hagyva nincs vége."
          error={state.fieldErrors?.repeatUntil}
        />
      )}

      <TextArea label="Megjegyzés (csak te látod)" name="note" rows={2} defaultValue={values.note} error={state.fieldErrors?.note} />

      <SubmitButton forcePending={pending} pendingText="Mentés…">{initial.id ? "Módosítások mentése" : "Mentés a naptárba"}</SubmitButton>
    </form>
  );
}
