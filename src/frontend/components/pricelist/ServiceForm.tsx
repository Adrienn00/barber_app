"use client";

import { useActionState, useState } from "react";
import { saveServiceAction } from "@/backend/pricelist/pricelist.actions";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import { Alert } from "@/frontend/components/ui/Alert";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextField } from "@/frontend/components/ui/TextField";
import type { FormState } from "@/shared/types/form";

/** Gyakori időtartamok egy koppintással (percben) */
const QUICK_DURATIONS = [15, 20, 30, 40, 45, 60, 75, 90];

type ServiceFormProps = {
  /** Meglévő szolgáltatás szerkesztésekor */
  service?: { id: string; name: string; durationMin: number; price: number };
  onSaved: (state: FormState) => void;
};

/** Szolgáltatás felvétele / szerkesztése: név, a barber SAJÁT időtartama, ár. */
export function ServiceForm({ service, onSaved }: ServiceFormProps) {
  const [state, action] = useActionState<FormState, FormData>(saveServiceAction, {});
  useOnActionResult(state, onSaved, true);

  const values = {
    name: service?.name ?? "",
    durationMin: service ? String(service.durationMin) : "30",
    price: service ? String(service.price) : "",
    ...state.values,
  };
  const [duration, setDuration] = useState(values.durationMin);

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {service && <input type="hidden" name="serviceId" value={service.id} />}

      <TextField label="Szolgáltatás neve" name="name" defaultValue={values.name} placeholder="pl. Hajvágás" error={state.fieldErrors?.name} />

      <div className="space-y-2">
        <TextField
          label="Mennyi időt vesz igénybe nálad? (perc)"
          name="durationMin"
          type="number"
          inputMode="numeric"
          min={5}
          max={480}
          step={5}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          hint="A saját tempód szerint add meg – a vendégek ennyi időre foglalhatnak nálad."
          error={state.fieldErrors?.durationMin}
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(String(m))}
              className={`rounded-full border px-3 py-1 text-sm ${
                duration === String(m) ? "border-brass text-brass" : "border-line text-muted hover:text-foreground"
              }`}
            >
              {m} perc
            </button>
          ))}
        </div>
      </div>

      <TextField
        label="Ár (lej)"
        name="price"
        inputMode="decimal"
        defaultValue={values.price}
        placeholder="pl. 60"
        error={state.fieldErrors?.price}
      />

      {service && (
        <p className="text-sm text-muted">Az új időtartam csak az új foglalásokra vonatkozik – a meglévők nem változnak.</p>
      )}

      <SubmitButton pendingText="Mentés…">{service ? "Módosítások mentése" : "Szolgáltatás felvétele"}</SubmitButton>
    </form>
  );
}
