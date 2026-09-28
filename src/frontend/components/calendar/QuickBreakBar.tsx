"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { quickBreakAction } from "@/backend/calendar/calendar.actions";
import { useOnActionResult } from "@/frontend/lib/useOnActionResult";
import type { FormState } from "@/shared/types/form";

const OPTIONS = [10, 15, 30, 45, 60];

type QuickBreakBarProps = {
  /** Sikeres mentés után (a naptár frissül, az üzenet megjelenik) */
  onDone: (state: FormState) => void;
};

/** „Szünet most” gombok: egy koppintással beír egy szünetet mostantól N percre. */
export function QuickBreakBar({ onDone }: QuickBreakBarProps) {
  const [state, action] = useActionState<FormState, FormData>(quickBreakAction, {});

  useOnActionResult(state, onDone);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
      <span className="mr-1 text-sm font-semibold">Szünet most:</span>
      {OPTIONS.map((minutes) => (
        <BreakButton key={minutes} minutes={minutes} />
      ))}
    </form>
  );
}

function BreakButton({ minutes }: { minutes: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="minutes"
      value={minutes}
      disabled={pending}
      className="min-h-10 rounded-lg border border-line px-3 text-sm font-semibold transition hover:border-brass hover:text-brass disabled:opacity-50"
    >
      {minutes === 60 ? "1 óra" : `${minutes} perc`}
    </button>
  );
}
