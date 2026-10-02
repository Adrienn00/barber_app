"use client";

import { useActionState } from "react";
import { saveBookingRulesAction } from "@/backend/schedule/schedule.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Card } from "@/frontend/components/ui/Card";
import { Select } from "@/frontend/components/ui/Select";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import type { FormState } from "@/shared/types/form";
import { type BookingRules, RULE_OPTIONS } from "@/shared/validation/schedule";

const FIELDS: { key: keyof BookingRules; label: string; hint: string }[] = [
  { key: "minNoticeMin", label: "Legkésőbb mikor foglalhatnak?", hint: "Pl. 2 óra: ma 14:00-ra legkésőbb 12:00-ig lehet kérni." },
  { key: "maxDaysAhead", label: "Meddig előre foglalhatnak?", hint: "Ennél távolabbi napokra nem látszanak szabad időpontok." },
  { key: "approvalTimeoutMin", label: "Mennyi időd van jóváhagyni egy kérést?", hint: "Ha addig nem döntesz, a kérés lejár, a vendég értesítést kap." },
  { key: "cancelLimitHours", label: "Meddig mondhatja le a vendég?", hint: "Ennél később a vendég már nem tudja lemondani az appban." },
  { key: "bufferMin", label: "Szünet két vendég között", hint: "Takarításra, pihenésre – ennyi idő marad szabadon minden foglalás után." },
  { key: "slotStepMin", label: "Milyen lépésközzel kínáljuk az időpontokat?", hint: "Pl. 15 perc: 9:00, 9:15, 9:30…" },
];

/** Foglalási szabályok: előre foglalás, jóváhagyási idő, lemondás, szünet két vendég között, lépésköz. */
export function BookingRulesForm({ initial }: { initial: BookingRules }) {
  const [state, action] = useActionState<FormState, FormData>(saveBookingRulesAction, {});

  return (
    <Card>
      <h2 className="text-2xl font-bold">Foglalási szabályok</h2>
      <form action={action} className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <Select
              key={f.key}
              label={f.label}
              name={f.key}
              defaultValue={String(state.values?.[f.key] ?? initial[f.key])}
              options={RULE_OPTIONS[f.key].map((o) => ({ value: String(o.value), label: o.label }))}
              hint={f.hint}
              error={state.fieldErrors?.[f.key]}
            />
          ))}
        </div>
        <SubmitButton pendingText="Mentés…">Szabályok mentése</SubmitButton>
      </form>
    </Card>
  );
}
