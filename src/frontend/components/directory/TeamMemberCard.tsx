import Link from "next/link";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { LinkButton } from "@/frontend/components/ui/Button";
import { barberPath, bookingPath } from "@/shared/config/routes";
import type { PublicBarber } from "@/shared/types/directory";

/** Egy barber az egység oldalán („Kik várnak a székben”): név, bemutatkozás, ártól, foglalás nála. */
export function TeamMemberCard({ barber }: { barber: PublicBarber }) {
  const minPrice = barber.services.length ? Math.min(...barber.services.map((s) => s.price)) : null;
  return (
    <article className="ct-lift flex w-full flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-4">
        <Avatar url={barber.avatarUrl} name={barber.name} size={56} />
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
