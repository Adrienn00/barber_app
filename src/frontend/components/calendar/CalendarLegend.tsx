const ITEMS = [
  { label: "Megerősített", className: "border-l-4 border-ok bg-ok/25" },
  { label: "Függőben", className: "border-2 border-dashed border-pending bg-pending/15" },
  {
    label: "Magánprogram / szünet",
    className:
      "border-l-4 border-muted bg-[repeating-linear-gradient(135deg,rgba(168,157,144,0.28)_0_6px,rgba(168,157,144,0.14)_6px_12px)]",
  },
  { label: "Munkaidőn kívül", className: "bg-black/35 border border-line" },
];

/** A naptár színeinek magyarázata. */
export function CalendarLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
      {ITEMS.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className={`inline-block h-4 w-6 rounded ${item.className}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
