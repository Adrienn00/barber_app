import Link from "next/link";
import { Icon } from "@/frontend/components/ui/Icon";
import type { PublicService } from "@/shared/types/directory";

type ServicePriceListProps = {
  services: PublicService[];
  /** Ha megadjuk, minden kártya a foglalásra visz, előre kiválasztott szolgáltatással */
  bookingHref?: (serviceId: string) => string;
};

/** Szolgáltatáskártyák árral és időtartammal (a v0-terv „Amiben otthon vagyunk” része). */
export function ServicePriceList({ services, bookingHref }: ServicePriceListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((s) => {
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold">{s.name}</h3>
              <span className="font-display text-xl font-semibold whitespace-nowrap text-brass">{s.price} lej</span>
            </div>
            <p className="flex items-center gap-2 text-muted">
              <Icon name="clock" size={16} /> {s.durationMin} perc
            </p>
          </>
        );
        return bookingHref ? (
          <Link
            key={s.id}
            href={bookingHref(s.id)}
            className="space-y-2 rounded-xl border border-line bg-surface p-5 transition hover:border-brass"
          >
            {content}
          </Link>
        ) : (
          <div key={s.id} className="space-y-2 rounded-xl border border-line bg-surface p-5">
            {content}
          </div>
        );
      })}
    </div>
  );
}
