"use client";

import { useActionState, useState } from "react";
import { createManualBookingAction } from "@/backend/calendar/calendar.actions";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import { Alert } from "@/frontend/components/ui/Alert";
import { Select } from "@/frontend/components/ui/Select";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import { TextArea } from "@/frontend/components/ui/TextArea";
import { TextField } from "@/frontend/components/ui/TextField";
import { fromMinutes, lengthLabel, toMinutes } from "@/shared/datetime/clock";
import type { CustomerOption, ServiceOption } from "@/shared/types/calendar";
import { useSubmitWithoutReset } from "@/frontend/lib/useSubmitWithoutReset";
import type { FormState } from "@/shared/types/form";

type ManualBookingFormProps = {
  services: ServiceOption[];
  customers: CustomerOption[];
  date: string;
  time: string;
  onSaved: (state: FormState) => void;
};

/**
 * Kézi foglalás (pl. telefonon jelentkező vendégnek) – azonnal megerősített. A befejezés magától kitöltődik
 * (kezdés + a szolgáltatás hossza), de a barber átírhatja; onnantól az marad.
 */
export function ManualBookingForm({ services, customers, date, time, onSaved }: ManualBookingFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(createManualBookingAction, {});
  // Beküldés automatikus alaphelyzetbe állítás nélkül (élő mezők vannak az űrlapon)
  const onSubmit = useSubmitWithoutReset(action);
  useOnActionResult(state, onSaved, true);
  const values: Record<string, string | undefined> = { date, time, ...state.values };
  const [customerId, setCustomerId] = useState(values.customerId ?? "");
  const [serviceId, setServiceId] = useState(values.serviceId ?? "");
  const [start, setStart] = useState(values.time ?? "");
  // Saját befejezés (ha a barber átírta); különben a szolgáltatás hosszából számoljuk
  const [customEnd, setCustomEnd] = useState<string | null>(values.endTime || null);

  const service = services.find((s) => s.id === serviceId);
  const startMin = toMinutes(start);
  const autoEnd = service && startMin !== null ? (fromMinutes(startMin + service.durationMin) ?? "") : "";
  const end = customEnd ?? autoEnd;
  const endMin = toMinutes(end);
  const length = startMin !== null && endMin !== null && endMin > startMin ? endMin - startMin : null;

  if (services.length === 0) {
    return <Alert tone="info">Kézi foglaláshoz előbb vegyél fel legalább egy aktív szolgáltatást.</Alert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Select
        label="Szolgáltatás"
        name="serviceId"
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value)}
        placeholder="Válassz…"
        options={services.map((s) => ({ value: s.id, label: `${s.name} · ${s.durationMin} perc · ${s.price} lej` }))}
        error={state.fieldErrors?.serviceId}
      />

      <TextField label="Nap" name="date" type="date" defaultValue={values.date} error={state.fieldErrors?.date} />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Kezdés"
          name="time"
          type="time"
          step={300}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          error={state.fieldErrors?.time}
        />
        <TextField
          label="Befejezés"
          name="endTime"
          type="time"
          step={60}
          value={end}
          onChange={(e) => setCustomEnd(e.target.value)}
          error={state.fieldErrors?.endTime}
        />
      </div>
      {!state.fieldErrors?.endTime && (
        <p className="-mt-2 text-sm text-muted">
          {length !== null ? `Időtartam: ${lengthLabel(length)}` : "A befejezés a szolgáltatás hosszából jön – átírhatod."}
          {customEnd !== null && autoEnd && customEnd !== autoEnd && (
            <>
              {" · "}
              <button type="button" className="text-brass underline" onClick={() => setCustomEnd(null)}>
                vissza a szokásosra ({service?.durationMin} perc)
              </button>
            </>
          )}
        </p>
      )}

      <Select
        label="Vendég"
        name="customerId"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        options={[
          { value: "", label: "Új vendég" },
          ...customers.map((c) => ({ value: c.id, label: c.phone ? `${c.name} · ${c.phone}` : c.name })),
        ]}
      />

      {!customerId && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Vendég neve" name="guestName" defaultValue={values.guestName} error={state.fieldErrors?.guestName} />
          <TextField
            label="Telefonszám (nem kötelező)"
            name="guestPhone"
            type="tel"
            inputMode="tel"
            placeholder="0745 123 456"
            defaultValue={values.guestPhone}
            error={state.fieldErrors?.guestPhone}
          />
        </div>
      )}

      <TextArea label="Megjegyzés (nem kötelező)" name="note" rows={2} defaultValue={values.note} error={state.fieldErrors?.note} />

      <SubmitButton forcePending={pending} pendingText="Mentés…">Foglalás felvétele</SubmitButton>
    </form>
  );
}
