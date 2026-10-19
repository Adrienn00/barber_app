"use client";

import { useState, useTransition } from "react";
import { saveStartPageAction } from "@/backend/schedule/schedule.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { START_PAGES, type StartPage } from "@/shared/config/startPage";
import type { FormState } from "@/shared/types/form";

/** „Az app megnyitásakor” választó: kezdőlap, naptár vagy rögtön új kézi foglalás. Választáskor ment. */
export function StartPagePicker({ value }: { value: StartPage }) {
  const [selected, setSelected] = useState<StartPage>(value);
  const [result, setResult] = useState<FormState | null>(null);
  const [busy, startTransition] = useTransition();

  function choose(next: StartPage) {
    const previous = selected;
    setSelected(next);
    setResult(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("startPage", next);
      const state = await saveStartPageAction({}, formData);
      if (state.error) setSelected(previous);
      setResult(state);
    });
  }

  return (
    <fieldset className="space-y-3" disabled={busy}>
      <legend className="sr-only">Az app megnyitásakor</legend>
      {START_PAGES.map((p) => (
        <label
          key={p.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
            selected === p.value ? "border-brass bg-brass/5" : "border-line"
          }`}
        >
          <input
            type="radio"
            name="startPage"
            value={p.value}
            checked={selected === p.value}
            onChange={() => choose(p.value)}
            className="mt-1 size-5 accent-[var(--color-brass)]"
          />
          <span>
            <span className="block font-semibold">{p.label}</span>
            <span className="block text-sm text-muted">{p.hint}</span>
          </span>
        </label>
      ))}
      <p className="text-sm text-muted">
        Az appon belül a logóra koppintva továbbra is a kezdőlapra jutsz – ez csak a megnyitáskor számít.
      </p>
      {result?.error && <Alert tone="error">{result.error}</Alert>}
      {result?.success && <Alert tone="success">{result.success}</Alert>}
    </fieldset>
  );
}
