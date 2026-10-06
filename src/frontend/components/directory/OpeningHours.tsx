import type { OpeningDay } from "@/shared/types/directory";

/** Nyitvatartás napokra bontva (zárt nap: „Zárva”). */
export function OpeningHours({ days }: { days: OpeningDay[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
      {days.map((d) => (
        <div key={d.weekday} className="contents">
          <dt className="text-muted">{d.label}</dt>
          <dd className={d.ranges.length ? "" : "text-muted"}>{d.ranges.length ? d.ranges.join(", ") : "Zárva"}</dd>
        </div>
      ))}
    </dl>
  );
}
