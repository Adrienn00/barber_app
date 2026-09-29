import { revokeInviteAction } from "@/backend/shops/shops.actions";
import type { ShopInvite } from "@/backend/shops/shops.service";
import { Card } from "@/frontend/components/ui/Card";
import { ConfirmActionButton } from "@/frontend/components/ui/ConfirmActionButton";
import { formatDateHu } from "@/shared/datetime/datetime";

/** Még meg nem válaszolt meghívók – visszavonhatók. */
export function PendingInvitesList({ invites }: { invites: ShopInvite[] }) {
  if (invites.length === 0) return null;
  return (
    <Card title={`Függő meghívók (${invites.length})`}>
      <ul className="divide-y divide-line">
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">{i.email}</p>
              <p className="text-sm text-muted">Érvényes: {formatDateHu(i.expiresAt)}-ig</p>
            </div>
            <ConfirmActionButton
              action={revokeInviteAction}
              fields={{ inviteId: i.id }}
              label="Visszavonás"
              confirmLabel="Igen, visszavonom"
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
