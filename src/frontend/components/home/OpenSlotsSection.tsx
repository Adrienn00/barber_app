import Link from "next/link";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { Eyebrow } from "@/frontend/components/ui/Eyebrow";
import { Icon } from "@/frontend/components/ui/Icon";
import { Reveal } from "@/frontend/components/ui/Reveal";
import { ROUTES, barberPath, bookingPath } from "@/shared/config/routes";
import type { OpenSlots } from "@/shared/types/directory";

/**
 * „Ma még szabad” a kezdőlapon: a ma még ráérő barberek (a legkorábbi elöl), mindegyiknél pár időponttal.
 * Egy időpontra koppintva a foglalás egyből a megerősítéssel indul. Ha senki nem ér rá, nem jelenik meg.
 */
export function OpenSlotsSection({ data }: { data: OpenSlots }) {
  if (data.barbers.length === 0) return null;
  const today = data.day === "today";

  return (
    <section className="mx-auto max-w-6xl space-y-5 px-5 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Eyebrow>
            <span className="relative mr-2 inline-flex size-2 self-center">
              <span aria-hidden className="ct-ping absolute inset-0 rounded-full bg-ok" />
              <span className="relative inline-flex size-2 rounded-full bg-ok" />
            </span>
            {today ? "Élő" : "Holnap"}
          </Eyebrow>
          <h2 className="text-3xl font-bold sm:text-4xl">{today ? "Ma még szabad" : "Holnap szabad"}</h2>
          <p className="text-muted">Koppints egy időpontra, és már csak el kell küldened a foglalást.</p>
        </div>
        <Link href={ROUTES.barbers} className="flex items-center gap-1 text-sm font-semibold text-brass hover:underline">
          Összes barber <Icon name="arrowRight" size={16} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.barbers.map((b, i) => (
          <Reveal key={b.slug} index={i}>
            <article className="ct-lift flex h-full flex-col gap-4 rounded-xl border border-line bg-surface p-5">
              <Link href={barberPath(b.slug)} className="group flex items-center gap-3">
                <Avatar url={b.avatarUrl} name={b.name} size={48} />
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-bold group-hover:text-brass">{b.name}</h3>
                  <p className="flex items-center gap-1 truncate text-sm text-muted">
                    <Icon name="mapPin" size={14} /> {b.city}, {b.address}
                  </p>
                </div>
              </Link>
              <p className="text-sm text-muted">
                {b.service.name} · {b.service.durationMin} perc ·{" "}
                <span className="font-semibold text-brass">{b.service.price} lej</span>
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                {b.slots.map((s) => (
                  <Link
                    key={s.startsAt}
                    href={bookingPath(b.slug, b.service.id, s.startsAt)}
                    aria-label={`${b.name}, ${today ? "ma" : "holnap"} ${s.time} – foglalás`}
                    className="min-h-11 min-w-16 rounded-lg border border-line bg-background px-3 py-2 text-center font-semibold transition duration-200 hover:-translate-y-0.5 hover:border-brass hover:text-brass"
                  >
                    {s.time}
                  </Link>
                ))}
                <Link
                  href={bookingPath(b.slug, b.service.id)}
                  className="flex min-h-11 items-center px-2 text-sm font-semibold text-muted hover:text-brass"
                >
                  Több időpont →
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
