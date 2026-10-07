import { Icon, type IconName } from "@/frontend/components/ui/Icon";
import { Reveal } from "@/frontend/components/ui/Reveal";

const FEATURES: { icon: IconName; label: string; value: string }[] = [
  { icon: "calendar", label: "Foglalás", value: "Online, 0–24" },
  { icon: "clock", label: "Visszaigazolás", value: "A barber hamar jóváhagyja" },
  { icon: "phone", label: "Emlékeztető", value: "Előző nap értesítünk" },
];

/** Ikonos információs sor a kezdőlap nyitó része alatt – egymás után úsznak be. */
export function FeatureRow() {
  return (
    <section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 sm:grid-cols-3">
      {FEATURES.map((f, i) => (
        <Reveal key={f.label} index={i}>
          <div className="ct-lift flex items-center gap-4 rounded-xl border border-line bg-surface/60 p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-brass/40 bg-brass/10 text-brass">
              <Icon name={f.icon} size={24} />
            </span>
            <div>
              <p className="text-sm text-muted">{f.label}</p>
              <p className="text-lg font-semibold">{f.value}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </section>
  );
}
