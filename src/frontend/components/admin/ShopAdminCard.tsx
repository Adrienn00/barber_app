import { changeShopStatusAction } from "@/backend/admin/admin.actions";
import type { AdminShop } from "@/backend/admin/admin.service";
import { BarberStatusBadge } from "@/frontend/components/barber/BarberStatusBadge";
import { Card } from "@/frontend/components/ui/Card";
import { formatDateHu } from "@/shared/datetime/datetime";
import { formatPhone } from "@/shared/validation/phone";
import { StatusActions } from "./StatusActions";

/** Egy egység kártyája az admin felületen: adatok, vezető + a státuszhoz illő gombok. */
export function ShopAdminCard({ shop }: { shop: AdminShop }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{shop.name}</h3>
        <BarberStatusBadge status={shop.status} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">Vezető</dt>
        <dd>{shop.ownerName}</dd>
        <dt className="text-muted">Link</dt>
        <dd>/u/{shop.slug}</dd>
        <dt className="text-muted">Hely</dt>
        <dd>
          {shop.city}, {shop.address}
        </dd>
        <dt className="text-muted">Telefon</dt>
        <dd>{formatPhone(shop.phone)}</dd>
        <dt className="text-muted">Létrehozva</dt>
        <dd>{formatDateHu(shop.createdAt)}</dd>
      </dl>
      {shop.bio && <p className="text-sm text-muted">{shop.bio}</p>}
      {shop.rejectReason && (
        <p className="text-sm">
          <span className="text-muted">Indoklás: </span>
          {shop.rejectReason}
        </p>
      )}
      <StatusActions
        action={changeShopStatusAction}
        idField="shopId"
        targetId={shop.id}
        status={shop.status}
        subject="az egység vezetője"
      />
    </Card>
  );
}
