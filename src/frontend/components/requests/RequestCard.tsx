import type { PendingRequest } from "@/backend/requests/requests.service";
import { Icon } from "@/frontend/components/ui/Icon";
import { formatDateTimeHu, toBucharestTime } from "@/shared/datetime/datetime";
import { BookingDecision } from "./BookingDecision";

/** Egy függő foglalási kérés a „Függő kérések” oldalon: időpont, vendég, szolgáltatás, határidő, döntés. */
export function RequestCard({ request }: { request: PendingRequest }) {
  return (
    <article className="space-y-4 rounded-xl border border-line bg-surface p-5">
      <div>
        <p className="font-display text-2xl font-semibold">
          {formatDateTimeHu(request.startsAt)} – {toBucharestTime(request.endsAt)}
        </p>
        <p className="text-muted">
          {request.serviceName} · {request.durationMin} perc · {request.price} lej
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2 font-semibold">
          <Icon name="user" size={18} className="text-brass" /> {request.customerName}
        </span>
        {request.customerPhone && (
          <a
            href={`tel:${request.customerPhone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-brass underline"
          >
            <Icon name="phone" size={18} /> {request.customerPhone}
          </a>
        )}
      </div>

      {request.note && (
        <p className="rounded-lg bg-background px-4 py-3 text-sm">
          <span className="text-muted">Megjegyzés: </span>
          {request.note}
        </p>
      )}

      <p className="text-sm text-muted">Dönts {formatDateTimeHu(request.expiresAt)}-ig, különben a kérés lejár.</p>

      <BookingDecision bookingId={request.id} status="pending" />
    </article>
  );
}
