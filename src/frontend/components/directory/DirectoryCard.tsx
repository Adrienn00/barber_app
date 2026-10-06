import Link from "next/link";
import { Badge } from "@/frontend/components/ui/Badge";
import { Icon } from "@/frontend/components/ui/Icon";
import { barberPath, shopPath } from "@/shared/config/routes";
import type { DirectoryEntry } from "@/shared/types/directory";

/** Egy egység vagy önálló barber a listában: név, hely, „…-tól” ár, rövid bemutatkozás. */
export function DirectoryCard({ entry }: { entry: DirectoryEntry }) {
  const href = entry.kind === "shop" ? shopPath(entry.slug) : barberPath(entry.slug);
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 transition hover:border-brass"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-bold group-hover:text-brass">{entry.name}</h2>
        {entry.kind === "shop" && <Badge>Egység · {entry.memberCount} barber</Badge>}
      </div>
      <p className="flex items-center gap-2 text-muted">
        <Icon name="mapPin" size={16} /> {entry.city}, {entry.address}
      </p>
      {entry.bio && <p className="line-clamp-2 text-sm text-muted">{entry.bio}</p>}
      <div className="mt-auto flex items-center justify-between pt-2">
        {entry.minPrice !== null && <span className="font-display text-xl font-semibold text-brass">{entry.minPrice} lejtől</span>}
        <span className="flex items-center gap-1 text-sm font-semibold">
          Időpontot foglalok <Icon name="arrowRight" size={16} />
        </span>
      </div>
    </Link>
  );
}
