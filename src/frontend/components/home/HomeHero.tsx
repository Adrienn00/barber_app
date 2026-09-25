import { Button, LinkButton } from "@/frontend/components/ui/Button";
import { Eyebrow } from "@/frontend/components/ui/Eyebrow";
import { Icon } from "@/frontend/components/ui/Icon";
import { ROUTES } from "@/shared/config/routes";

/** A kezdőlap nyitó része: címke, kétszínű nagy cím, rövid leírás, két fő gomb. */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Meleg fény a háttérben (a v0-terv fotós hangulatát idézi, kép nélkül) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(212,169,94,0.18),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgba(212,169,94,0.08),transparent_50%)]"
      />
      {/* Nagy, halvány olló díszítésnek asztali nézetben (amíg nincsenek saját fotók) */}
      <Icon
        name="scissors"
        size={420}
        strokeWidth={0.6}
        className="pointer-events-none absolute top-1/2 right-[6%] hidden -translate-y-1/2 -rotate-12 text-brass/15 lg:block"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-24">
        <div>
          <Eyebrow pill>Online időpontfoglalás</Eyebrow>
        </div>
        <h1 className="max-w-4xl text-5xl font-bold sm:text-7xl">
          Friss fazon,
          <br />
          <span className="text-brass">pár kattintással.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted sm:text-xl">
          Válaszd ki a barbered, a szolgáltatást és egy szabad időpontot – egyszerűen, gyorsan, akár telefonról is.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* A barberlista a 4. fázisban készül el */}
          <Button disabled>
            <Icon name="calendar" /> Időpontot foglalok – hamarosan
          </Button>
          <LinkButton href={ROUTES.becomeBarber} variant="secondary">
            Barber vagyok, csatlakozom
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
