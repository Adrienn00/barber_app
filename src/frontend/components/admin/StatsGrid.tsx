import type { AdminStats } from "@/backend/admin/admin.service";

const ITEMS: { key: keyof AdminStats; label: string }[] = [
  { key: "barbers_approved", label: "Aktív barber" },
  { key: "barbers_pending", label: "Függő jelentkezés" },
  { key: "barbers_suspended", label: "Felfüggesztett" },
  { key: "customers", label: "Vendég" },
  { key: "bookings_upcoming", label: "Közelgő foglalás" },
  { key: "bookings_total", label: "Összes foglalás" },
];

/** Platform alapszámok csempékben. */
export function StatsGrid({ stats }: { stats: AdminStats }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ITEMS.map((item) => (
        <div key={item.key} className="rounded-2xl border border-line bg-surface p-4">
          <dt className="text-sm text-muted">{item.label}</dt>
          <dd className="mt-1 font-serif text-3xl font-bold">{stats[item.key]}</dd>
        </div>
      ))}
    </dl>
  );
}
