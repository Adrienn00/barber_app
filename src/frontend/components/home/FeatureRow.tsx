import { Icon, type IconName } from "@/frontend/components/ui/Icon";

const FEATURES: { icon: IconName; label: string; value: string }[] = [
  { icon: "calendar", label: "Foglalás", value: "Online, 0–24" },
  { icon: "clock", label: "Visszaigazolás", value: "A barber hamar jóváhagyja" },
  { icon: "phone", label: "Emlékeztető", value: "Előző nap értesítünk" },
];

/** Ikonos információs sor a kezdőlap nyitó része alatt. */
export function FeatureRow() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-3">
      {FEATURES.map((f) => (
        <div key={f.label} className="flex items-center gap-4">
          <span className="text-brass">
            <Icon name={f.icon} size={28} />
          </span>
          <div>
            <p className="text-sm text-muted">{f.label}</p>
            <p className="text-lg font-semibold">{f.value}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
