"use client";

import { useActionState, useState } from "react";
import { saveWorkingHoursAction } from "@/backend/schedule/schedule.actions";
import { Alert } from "@/frontend/components/ui/Alert";
import { Card } from "@/frontend/components/ui/Card";
import { SubmitButton } from "@/frontend/components/ui/SubmitButton";
import type { FormState } from "@/shared/types/form";
import { type DayHours, WEEK_DAYS } from "@/shared/validation/schedule";

const DEFAULT_RANGE = { start: "09:00", end: "17:00" };

/**
 * Heti munkaidő: minden nap nyitva/zárva, egy vagy több sávval (pl. ebédszünet: 9–13 és 14–18).
 * A vendégek csak ezekre az időkre foglalhatnak (a kézi foglalás ettől független).
 */
export function WorkingHoursEditor({ initial }: { initial: DayHours[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveWorkingHoursAction, {});
  const [week, setWeek] = useState<DayHours[]>(initial);

  function updateDay(weekday: number, change: (day: DayHours) => DayHours) {
    setWeek((w) => w.map((d) => (d.weekday === weekday ? change(d) : d)));
  }

  /** Hétfő beosztása keddtől péntekig */
  function copyMondayToWeekdays() {
    const monday = week.find((d) => d.weekday === 1)!;
    setWeek((w) =>
      w.map((d) =>
        d.weekday >= 2 && d.weekday <= 5 ? { ...d, open: monday.open, ranges: monday.ranges.map((r) => ({ ...r })) } : d,
      ),
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Munkaidő</h2>
          <p className="text-muted">Ezekre az időkre foglalhatnak a vendégek. Ebédszünethez adj hozzá egy második sávot.</p>
        </div>
        <button type="button" onClick={copyMondayToWeekdays} className="text-sm font-semibold text-brass underline">
          Hétfő másolása keddtől péntekig
        </button>
      </div>

      {/* A szerkesztő mezők szándékosan a <form>-on KÍVÜL vannak: mentés után a React alaphelyzetbe
          állítja az űrlap mezőit, ami a jelölőnégyzeteket tévesen „zárva” állapotba tenné. */}
      <div className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.success && <Alert tone="success">{state.success}</Alert>}

        <ul className="divide-y divide-line">
          {WEEK_DAYS.map(({ weekday, label }) => {
            const day = week.find((d) => d.weekday === weekday)!;
            const error = state.fieldErrors?.[`day-${weekday}`];
            return (
              <li key={weekday} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex w-36 cursor-pointer items-center gap-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={day.open}
                      onChange={(e) =>
                        updateDay(weekday, (d) => ({
                          ...d,
                          open: e.target.checked,
                          ranges: e.target.checked && d.ranges.length === 0 ? [{ ...DEFAULT_RANGE }] : d.ranges,
                        }))
                      }
                      className="size-5 accent-[var(--color-brass)]"
                    />
                    {label}
                  </label>

                  {!day.open ? (
                    <span className="text-muted">Zárva</span>
                  ) : (
                    <div className="flex flex-1 flex-col gap-2">
                      {day.ranges.map((range, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <TimeInput
                            label={`${label} ${i + 1}. sáv kezdete`}
                            value={range.start}
                            onChange={(v) =>
                              updateDay(weekday, (d) => ({
                                ...d,
                                ranges: d.ranges.map((r, j) => (j === i ? { ...r, start: v } : r)),
                              }))
                            }
                          />
                          <span className="text-muted">–</span>
                          <TimeInput
                            label={`${label} ${i + 1}. sáv vége`}
                            value={range.end}
                            onChange={(v) =>
                              updateDay(weekday, (d) => ({
                                ...d,
                                ranges: d.ranges.map((r, j) => (j === i ? { ...r, end: v } : r)),
                              }))
                            }
                          />
                          {day.ranges.length > 1 && (
                            <button
                              type="button"
                              aria-label="Sáv törlése"
                              onClick={() => updateDay(weekday, (d) => ({ ...d, ranges: d.ranges.filter((_, j) => j !== i) }))}
                              className="px-2 text-xl text-muted hover:text-danger"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateDay(weekday, (d) => {
                            const last = d.ranges[d.ranges.length - 1];
                            // Új sáv az előző vége után 1 órával (pl. ebédszünet utánra)
                            const start = last ? addHour(last.end) : DEFAULT_RANGE.start;
                            return { ...d, ranges: [...d.ranges, { start, end: addHour(start, 4) }] };
                          })
                        }
                        className="self-start text-sm text-brass hover:underline"
                      >
                        + sáv (pl. ebédszünet után)
                      </button>
                    </div>
                  )}
                </div>
                {error && <p className="text-sm text-danger">{error}</p>}
              </li>
            );
          })}
        </ul>

        <form action={action}>
          <input type="hidden" name="week" value={JSON.stringify(week)} />
          <SubmitButton pendingText="Mentés…">Munkaidő mentése</SubmitButton>
        </form>
      </div>
    </Card>
  );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      step={300}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-11 rounded-lg border border-line bg-surface px-3 outline-none focus:border-brass"
    />
  );
}

/** „13:00” + 1 óra → „14:00” (legfeljebb 23:59) */
function addHour(time: string, hours = 1): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + hours * 60, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
