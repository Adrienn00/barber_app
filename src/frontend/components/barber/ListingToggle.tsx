"use client";

import { useState, useTransition } from "react";
import { setListingAction } from "@/backend/barbers/barbers.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import type { FormState } from "@/shared/types/form";

/** „Megjelenjek a nyilvános listában” kapcsoló – a foglalási link ettől függetlenül működik. */
export function ListingToggle({ listed }: { listed: boolean }) {
  const [checked, setChecked] = useState(listed);
  const [result, setResult] = useState<FormState | null>(null);
  const [busy, startTransition] = useTransition();

  function toggle(next: boolean) {
    setChecked(next);
    setResult(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("listed", String(next));
      const state = await setListingAction({}, formData);
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
          <span className="block font-semibold">Megjelenek a nyilvános barberlistában</span>
          <span className="block text-sm text-muted">
            Ha kikapcsolod, a listában nem talál meg senki, de akinek elküldöd a linkedet, továbbra is foglalhat.
          </span>
        </span>
      </label>
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      {result?.success && <Alert tone="success">{result.success}</Alert>}
    </div>
  );
}
