import Link from "next/link";
import { LinkButton } from "@/frontend/components/ui/Button";
import { barberPath, bookingPath } from "@/shared/config/routes";
import type { PublicBarber } from "@/shared/types/directory";

/** Egy barber az egység oldalán („Kik várnak a székben”): név, bemutatkozás, ártól, foglalás nála. */
export function TeamMemberCard({ barber }: { barber: PublicBarber }) {
  const minPrice = barber.services.length ? Math.min(...barber.services.map((s) => s.price)) : null;
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brass font-display text-2xl font-bold text-background">
          {barber.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h3 className="text-2xl font-bold">
            <Link href={barberPath(barber.slug)} className="hover:text-brass">
              {barber.name}
            </Link>
          </h3>
          {minPrice !== null && <p className="text-brass">{minPrice} lejtől</p>}
        </div>
      </div>
      {barber.bio && <p className="text-sm text-muted">{barber.bio}</p>}
      <p className="text-sm text-muted">{barber.services.map((s) => s.name).join(" · ")}</p>
      <LinkButton href={bookingPath(barber.slug)} className="mt-auto">
        Időpontot foglalok nála
      </LinkButton>
    </article>
  );
}
