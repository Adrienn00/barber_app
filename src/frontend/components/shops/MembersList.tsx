import { removeMemberAction } from "@/backend/shops/shops.actions";
import type { ShopMember } from "@/backend/shops/shops.service";
import { Badge } from "@/frontend/components/ui/Badge";
import { Card } from "@/frontend/components/ui/Card";
import { ConfirmActionButton } from "@/frontend/components/ui/ConfirmActionButton";

/** Az egység tagjai; a vezető eltávolíthat egy tagot (aki ezután újra önálló barber lesz). */
export function MembersList({ members }: { members: ShopMember[] }) {
  return (
    <Card title={`Csapat (${members.length})`}>
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.barberId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">
                {m.displayName} {m.isOwner && <Badge tone="success">Vezető</Badge>}
              </p>
              <p className="text-sm text-muted">/b/{m.slug}</p>
            </div>
            {!m.isOwner && (
              <ConfirmActionButton
                action={removeMemberAction}
                fields={{ barberId: m.barberId }}
                label="Eltávolítás"
                confirmLabel="Igen, eltávolítom"
                question="Újra önálló barber lesz."
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
