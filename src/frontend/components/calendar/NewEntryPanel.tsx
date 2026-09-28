"use client";

import { useState } from "react";
import type { CustomerOption, ServiceOption } from "@/shared/types/calendar";
import type { FormState } from "@/shared/types/form";
import type { PrivateEventInput } from "@/shared/validation/calendar";
import { ManualBookingForm } from "./ManualBookingForm";
import { PrivateEventForm } from "./PrivateEventForm";

type NewEntryPanelProps = {
  /** A naptárban kijelölt idő */
  slot: { date: string; startTime: string; endTime: string; allDay: boolean };
  services: ServiceOption[];
  customers: CustomerOption[];
  onSaved: (state: FormState) => void;
};

/** Üres időre kattintva: választás magánprogram/szünet és kézi foglalás között. */
export function NewEntryPanel({ slot, services, customers, onSaved }: NewEntryPanelProps) {
  const [tab, setTab] = useState<"private" | "booking">("private");

  const privateInitial: PrivateEventInput = {
    title: "",
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    allDay: slot.allDay,
    endDate: "",
    repeatWeekly: false,
    repeatUntil: "",
    note: "",
  };

  return (
    <div className="space-y-5">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
        {[
          { id: "private" as const, label: "Program / szünet" },
          { id: "booking" as const, label: "Kézi foglalás" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 rounded-md font-semibold ${tab === t.id ? "bg-brass text-background" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "private" ? (
        <PrivateEventForm initial={privateInitial} onSaved={onSaved} />
      ) : (
        <ManualBookingForm services={services} customers={customers} date={slot.date} time={slot.startTime} onSaved={onSaved} />
      )}
    </div>
  );
}
