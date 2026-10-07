import type { CSSProperties } from "react";
import { LinkButton } from "@/frontend/components/ui/Button";
import { Eyebrow } from "@/frontend/components/ui/Eyebrow";
import { Icon } from "@/frontend/components/ui/Icon";
import { ROUTES } from "@/shared/config/routes";

/** Sorrend a beúszáshoz (a késleltetést a ct-enter osztály számolja) */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * A kezdőlap nyitó része: címke, kétszínű nagy cím (a második sor arany csillogással), rövid leírás,
 * két fő gomb. Háttérben lassan mozgó meleg fény, lebegő olló, alul „barber pole” csík.
 */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Meleg fény a háttérben, lassan „lélegzik” (a széle nem látszik, mert nagyobb a dobozánál) */}
      <div
        aria-hidden
        className="ct-glow absolute -inset-[15%] bg-[radial-gradient(ellipse_at_75%_25%,rgba(212,169,94,0.22),transparent_50%),radial-gradient(ellipse_at_15%_85%,rgba(212,169,94,0.1),transparent_45%)]"
      />
      {/* Finom szemcsés textúra a fény fölött – prémium, „nyomott” hatás */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:3px_3px]"
      />
      {/* Nagy, halvány, lassan lebegő olló asztali nézetben */}
      <div className="pointer-events-none absolute top-1/2 right-[6%] hidden -translate-y-1/2 lg:block">
        <Icon name="scissors" size={420} strokeWidth={0.6} className="ct-float -rotate-12 text-brass/20" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 sm:py-24">
        <div className="ct-enter" style={order(0)}>
          <Eyebrow pill>
            <span className="relative mr-3 inline-flex size-2.5 self-center">
              <span aria-hidden className="ct-ping absolute inset-0 rounded-full bg-brass" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brass" />
            </span>
            Online időpontfoglalás
          </Eyebrow>
        </div>
        <h1 className="max-w-4xl text-5xl font-bold sm:text-7xl">
          <span className="ct-enter inline-block" style={order(1)}>
            Friss fazon,
          </span>
          <br />
          <span className="ct-enter ct-gold-text inline-block pb-1" style={order(2)}>
            pár kattintással.
          </span>
        </h1>
        <p className="ct-enter max-w-2xl text-lg text-muted sm:text-xl" style={order(3)}>
          Válaszd ki a barbered, a szolgáltatást és egy szabad időpontot – egyszerűen, gyorsan, akár telefonról is.
        </p>
        <div className="ct-enter flex flex-col gap-3 sm:flex-row" style={order(4)}>
          <LinkButton href={ROUTES.barbers}>
            <Icon name="calendar" /> Időpontot foglalok
          </LinkButton>
          <LinkButton href={ROUTES.becomeBarber} variant="secondary">
            Barber vagyok, csatlakozom
          </LinkButton>
        </div>
      </div>

      {/* „Barber pole” csík az alján */}
      <div aria-hidden className="ct-pole relative h-1.5 opacity-80" />
    </section>
  );
}
