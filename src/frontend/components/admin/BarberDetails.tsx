import type { AdminBarber } from "@/backend/admin/admin.service";
import { BarberStatusBadge } from "@/frontend/components/barber/BarberStatusBadge";
import { formatDateHu } from "@/shared/datetime/datetime";
import { formatPhone } from "@/shared/validation/phone";

/** Egy barber adatai az admin felületen (név, link, elérhetőség, bemutatkozás). */
export function BarberDetails({ barber }: { barber: AdminBarber }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{barber.displayName}</h3>
        <BarberStatusBadge status={barber.status} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">Link</dt>
        <dd>/b/{barber.slug}</dd>
        <dt className="text-muted">Hely</dt>
        <dd>
          {barber.city}, {barber.address}
        </dd>
        <dt className="text-muted">Telefon</dt>
        <dd>{formatPhone(barber.phone)}</dd>
        {barber.instagram && (
          <>
            <dt className="text-muted">Instagram</dt>
            <dd>@{barber.instagram}</dd>
          </>
        )}
        <dt className="text-muted">Jelentkezett</dt>
        <dd>{formatDateHu(barber.createdAt)}</dd>
      </dl>
      {barber.bio && <p className="text-sm text-muted">{barber.bio}</p>}
      {barber.rejectReason && (
        <p className="text-sm">
          <span className="text-muted">Indoklás: </span>
          {barber.rejectReason}
        </p>
      )}
    </div>
  );
}
