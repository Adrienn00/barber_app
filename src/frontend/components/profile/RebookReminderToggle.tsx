"use client";

import { useState, useTransition } from "react";
import { setRebookRemindersAction } from "@/backend/profile/profile.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import type { FormState } from "@/shared/types/form";

/** „Ideje vágatni” emlékeztető kapcsolója: szóljunk-e, ha letelt a szokásos idő a legutóbbi vágás óta. */
export function RebookReminderToggle({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [result, setResult] = useState<FormState | null>(null);
  const [busy, startTransition] = useTransition();

  function toggle(next: boolean) {
    setChecked(next);
    setResult(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("enabled", String(next));
      const state = await setRebookRemindersAction({}, formData);
      if (state.error) setChecked(!next);
      setResult(state);
    });
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-1 size-5 accent-[var(--color-brass)]"
        />
        <span>
          <span className="block font-semibold">Szólj, ha ideje vágatni</span>
          <span className="block text-sm text-muted">
            Ha a szokásos időd (pl. 3–4 hét) letelt a legutóbbi vágás óta, és még nincs új foglalásod, értesítést
            kapsz a barbered legközelebbi szabad időpontjával – egy koppintással lefoglalhatod.
          </span>
        </span>
      </label>
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      {result?.success && <Alert tone="success">{result.success}</Alert>}
    </div>
  );
}
